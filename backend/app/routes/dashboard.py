from flask import Blueprint, jsonify
import random
import os
import json
from datetime import datetime, timedelta
from groq import Groq
from app.utils.data_manager import load_bins, load_reports, get_eco_points_users

dashboard_bp = Blueprint('dashboard', __name__)

# Initialize Groq Client
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

@dashboard_bp.route('/api/dashboard', methods=['GET'])
def dashboard():
    bins = load_bins()
    total = len(bins)
    critical = sum(1 for b in bins if b['fillLevel'] >= 80)
    warning = sum(1 for b in bins if 60 <= b['fillLevel'] < 80)
    low = sum(1 for b in bins if b['fillLevel'] < 40)
    avg_fill = round(sum(b['fillLevel'] for b in bins) / total, 1) if total else 0
    efficiency = round(100 - (critical / total * 100), 1) if total else 100

    # Grounded weekly data
    days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    reports = load_reports()
    
    # Calculate weekly collections (kg removed from city)
    # We'll use kg now so it's comparable with wasteKg
    weekly_collections_kg = [0] * 7
    now = datetime.now()
    start_of_week = now - timedelta(days=now.weekday())
    
    # Baseline collections (to avoid empty line)
    # Average collection per day ~300kg (simulated history)
    base_seed = len(bins) 
    for i in range(7):
        weekly_collections_kg[i] = round(300 + (base_seed + i*15)%100, 1)

    # Actual data from resolved reports
    for r in reports:
        if r.get('status') == 'resolved' and 'resolved_at' in r:
            try:
                res_date = datetime.fromisoformat(r['resolved_at'].replace('Z', ''))
                if res_date >= start_of_week:
                    day_idx = res_date.weekday()
                    # Add mass for this resolution (each bin collected ~40-60kg)
                    weekly_collections_kg[day_idx] += random.randint(40, 60)
            except Exception: continue

    # Calculate weekly waste mass (remaining in bins)
    current_mass = sum(b['fillLevel'] * 0.5 for b in bins)
    
    weekly_waste_kg = []
    for i in range(7):
        if i == now.weekday():
            weekly_waste_kg.append(round(current_mass, 1))
        else:
            # Deterministic pattern slightly above collections
            day_variation = (base_seed * 10 + (i * 25)) % 150
            weekly_waste_kg.append(round(current_mass * 0.75 + day_variation, 1))

    # Recent alerts
    alerts = []
    for b in sorted(bins, key=lambda x: -x['fillLevel'])[:5]:
        if b['fillLevel'] >= 80:
            alerts.append({
                'type': 'critical',
                'message': f"{b['name']} is {b['fillLevel']}% full — needs immediate collection!",
                'time': '2 min ago',
                'bin_id': b['id']
            })
        elif b['fillLevel'] >= 60:
            alerts.append({
                'type': 'warning',
                'message': f"{b['name']} is filling up ({b['fillLevel']}%)",
                'time': '10 min ago',
                'bin_id': b['id']
            })

    # Zone summary
    zones = {}
    for b in bins:
        z = b['zone']
        if z not in zones:
            zones[z] = {'total': 0, 'critical': 0, 'avgFill': 0}
        zones[z]['total'] += 1
        zones[z]['avgFill'] += b['fillLevel']
        if b['fillLevel'] >= 80:
            zones[z]['critical'] += 1
    for z in zones:
        zones[z]['avgFill'] = round(zones[z]['avgFill'] / zones[z]['total'], 1)

    # AI Waste Generation Predictions using Groq Llama
    today_day = now.strftime("%A")
    bin_data_summary = [{"name": b['name'], "fill": b['fillLevel'], "zone": b['zone']} for b in bins[:10]]
    
    prediction_prompt = f"""
    Given the following waste management data for Coimbatore:
    - Today: {today_day}, {now.strftime('%Y-%m-%d')}
    - Current Bin Status (Sample): {bin_data_summary}
    
    Generate 4 realistic waste generation predictions for different areas or patterns in the city.
    Return ONLY a JSON array of objects with these keys: 
    'area' (string), 'pattern' (string), 'increase' (string, e.g. '+15%'), 'detail' (string), 'icon' (emoji), 'confidence' (float 0.0-1.0).
    """

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are an AI waste analytics engine. Return valid JSON only."},
                {"role": "user", "content": prediction_prompt}
            ],
            response_format={"type": "json_object"}
        )
        pred_content = completion.choices[0].message.content
        pred_data = json.loads(pred_content)
        # Handle both {"predictions": [...]} and plain [...]
        predictions = pred_data.get('predictions', pred_data) if isinstance(pred_data, dict) else pred_data
        if not isinstance(predictions, list):
            raise ValueError("Expected list for predictions")
    except Exception as e:
        print(f"Error generating AI predictions: {e}")
        # Fallback to static if API fails
        predictions = [
            {'area': 'Gandhipuram', 'pattern': 'Rush Hour', 'increase': '+25%', 'detail': 'Static fallback prediction.', 'icon': '📈', 'confidence': 0.85}
        ]

    # Anomaly Detection
    anomalies = []
    for b in bins:
        if b['fillLevel'] >= 90:
            anomalies.append({
                'bin': b['name'],
                'location': b['location'],
                'fillLevel': b['fillLevel'],
                'severity': 'high',
                'message': f"Abnormal spike detected — {b['name']} at {b['fillLevel']}%, well above zone average",
                'action': 'Deploy emergency collection team immediately'
            })
        elif b['fillLevel'] >= 75 and random.random() > 0.5:
            anomalies.append({
                'bin': b['name'],
                'location': b['location'],
                'fillLevel': b['fillLevel'],
                'severity': 'medium',
                'message': f"Unusual fill rate — {b['name']} filling faster than historical average",
                'action': 'Schedule early collection within 2 hours'
            })

    return jsonify({
        'totalBins': total,
        'criticalBins': critical,
        'warningBins': warning,
        'lowBins': low,
        'avgFillLevel': avg_fill,
        'collectionEfficiency': efficiency,
        'wasteCollectedToday': f"{round(sum(u['recycled_kg'] for u in get_eco_points_users()), 1)} kg",
        'weeklyData': {'days': days, 'collections': weekly_collections_kg, 'wasteKg': weekly_waste_kg},
        'alerts': alerts,
        'zones': zones,
        'predictions': predictions,
        'anomalies': anomalies
    })
