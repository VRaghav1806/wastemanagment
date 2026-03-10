from flask import Blueprint, request, jsonify
import random
import os
import json
import resend
from datetime import datetime
from groq import Groq
from app.utils.data_manager import load_reports, save_reports, load_bins, get_eco_points_users, register_user, update_user_stats

citizen_bp = Blueprint('citizen', __name__)

# Initialize Groq Client
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Initialize Resend
resend.api_key = os.environ.get("RESEND_API_KEY")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@example.com")

@citizen_bp.route('/api/citizen/report', methods=['POST'])
def citizen_report():
    data = request.json
    print(f"DEBUG: Received report data: {data}")
    reports = load_reports()
    
    # Deduplication: Check if an identical report is already pending
    desc = data.get('description', 'Overflowing bin')
    loc = data.get('location', 'Unknown')
    is_duplicate = any(
        r['description'] == desc and 
        r['location'] == loc and 
        r['status'] == 'pending' 
        for r in reports
    )
    
    if is_duplicate:
        print(f"DEBUG: Duplicate report detected for {loc}")
        return jsonify({'error': 'This issue has already been reported and is being addressed.'}), 409

    report = {
        'id': max([r['id'] for r in reports]) + 1 if reports else 1,
        'description': data.get('description', 'Overflowing bin'),
        'location': data.get('location', 'Unknown'),
        'lat': float(data.get('lat', 11.0165 + random.uniform(-0.03, 0.03))),
        'lng': float(data.get('lng', 76.9693 + random.uniform(-0.03, 0.03))),
        'type': data.get('type', 'overflow'),
        'status': 'pending',
        'timestamp': datetime.now().isoformat(),
        'reporter': data.get('reporter', 'Anonymous Citizen'),
        'points_earned': 25
    }
    reports.append(report)
    print(f"DEBUG: Saving reports. Total count: {len(reports)}")
    save_reports(reports)
    
    # Update user points if reporter is known
    reporter_name = data.get('reporter')
    if reporter_name:
        update_user_stats(reporter_name, 25)
        print(f"DEBUG: Credited 25 points to {reporter_name}")

    # Send email notification to admin via Resend
    try:
        params = {
            "from": "Circular Waste Intelligence <onboarding@resend.dev>",
            "to": [ADMIN_EMAIL],
            "subject": f"🚨 New Waste Report: {report['type']} at {report['location']}",
            "html": f"""
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #ff5252;">New Waste Issue Reported</h2>
                    <p><strong>Type:</strong> {report['type'].replace('_', ' ').title()}</p>
                    <p><strong>Location:</strong> {report['location']}</p>
                    <p><strong>Description:</strong> {report['description']}</p>
                    <p><strong>Reporter:</strong> {report['reporter']}</p>
                    <p><strong>Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #666;">This is an automated notification from the Circular Waste Intelligence Platform.</p>
                </div>
            """
        }
        resend_res = resend.Emails.send(params)
        print(f"DEBUG: Notification email sent to {ADMIN_EMAIL}. Response: {resend_res}")
    except Exception as e:
        print(f"ERROR: Failed to send notification email: {e}")
    
    # Remove _id which was added by MongoDB insert_many to avoid serialization error
    if '_id' in report:
        report.pop('_id')
        
    return jsonify(report), 201

@citizen_bp.route('/api/citizen/register', methods=['POST'])
def citizen_register():
    data = request.json
    if not data or not data.get('username'):
        return jsonify({'error': 'Username is required'}), 400
    
    user = register_user({
        'username': data['username'],
        'email': data.get('email', ''),
        'joined': datetime.now().strftime('%b %Y')
    })
    
    if not user:
        return jsonify({'error': 'User already exists'}), 409
        
    return jsonify(user), 201

@citizen_bp.route('/api/admin/reports', methods=['GET'])
def admin_get_reports():
    return jsonify(load_reports())

@citizen_bp.route('/api/admin/reports/<int:report_id>/resolve', methods=['PATCH'])
def admin_resolve_report(report_id):
    reports = load_reports()
    for r in reports:
        if r['id'] == report_id:
            r['status'] = 'resolved'
            r['resolved_at'] = datetime.now().isoformat()
            save_reports(reports)
            if '_id' in r: r.pop('_id')
            return jsonify(r)
    return jsonify({'error': 'Report not found'}), 404

@citizen_bp.route('/api/citizen/nearest', methods=['GET'])
def citizen_nearest():
    import math
    lat = float(request.args.get('lat', 11.0165))
    lng = float(request.args.get('lng', 76.9693))
    bins = load_bins()

    for b in bins:
        b['distance'] = round(math.sqrt(
            (b['lat'] - lat)**2 + (b['lng'] - lng)**2
        ) * 111, 2)

    nearest = sorted(bins, key=lambda x: x['distance'])[:5]
    return jsonify(nearest)

@citizen_bp.route('/api/citizen/eco-points', methods=['GET'])
def citizen_eco_points():
    reports = load_reports()
    total_reports = len(reports) + 150
    bins_cleaned = sum(1 for r in reports if r.get('status') == 'resolved') + 300
    users = get_eco_points_users()
    recycled_total = sum(u['recycled_kg'] for u in users)

    recent_reports = reports if reports else []

    # Dynamic AI Recycling Tips using Llama
    prompt = """
    Generate 5 creative and educational recycling tips for citizens in a smart city.
    Each tip must have:
    - 'type': The material or category (e.g., 'Plastic', 'E-waste', 'Composting').
    - 'icon': A relevant emoji.
    - 'tip': A clear, actionable instruction (1 sentence).
    - 'fact': A surprising or motivating environmental fact related to the tip (1 sentence).
    
    Return ONLY valid JSON as a list of objects.
    """
    
    try:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are an environmental sustainability expert. Return valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        ai_data = json.loads(completion.choices[0].message.content)
        # Handle cases where Llama wraps it in a key
        recycling_tips = ai_data.get('tips', ai_data) if isinstance(ai_data, dict) else ai_data
        if not isinstance(recycling_tips, list):
            # If it returned a dict but not a list under 'tips', use it if it's a list-like dict
            if isinstance(ai_data, dict) and any(isinstance(v, list) for v in ai_data.values()):
                for v in ai_data.values():
                    if isinstance(v, list):
                        recycling_tips = v
                        break
    except Exception as e:
        print(f"Error generating AI recycling tips: {e}")
        recycling_tips = [
            {'type': 'Plastic', 'icon': '🧴', 'tip': 'Rinse plastic containers before recycling.', 'fact': 'Recycling 1 ton of plastic saves 7,200 kWh'},
            {'type': 'Paper', 'icon': '📄', 'tip': 'Keep paper dry and clean.', 'fact': 'Recycling 1 ton of paper saves 17 trees'},
        ]

    return jsonify({
        'leaderboard': users,
        'communityStats': {
            'totalReports': total_reports,
            'binsCleaned': bins_cleaned,
            'recycledKg': recycled_total,
            'activeCitizens': len(users) + 42
        },
        'recentReports': recent_reports,
        'recyclingTips': recycling_tips
    })
