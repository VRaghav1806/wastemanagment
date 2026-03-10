from flask import Blueprint, jsonify
import random
from app.utils.data_manager import load_bins

circular_bp = Blueprint('circular', __name__)

@circular_bp.route('/api/circular-economy', methods=['GET'])
def circular_economy():
    bins = load_bins()
    total_waste = sum(b['fillLevel'] for b in bins) * 0.5

    recovery = {
        'plastic': {
            'collected_kg': round(total_waste * 0.28, 1),
            'recycled_kg': round(total_waste * 0.28 * 0.72, 1),
            'recovery_rate': 72,
            'destination': 'Plastic Recycling Plant - Unit 3',
            'revenue': round(total_waste * 0.28 * 0.72 * 15, 0),
            'co2_saved': round(total_waste * 0.28 * 0.72 * 1.5, 1)
        },
        'organic': {
            'collected_kg': round(total_waste * 0.35, 1),
            'composted_kg': round(total_waste * 0.35 * 0.85, 1),
            'recovery_rate': 85,
            'destination': 'City Compost Center - Section B',
            'revenue': round(total_waste * 0.35 * 0.85 * 6, 0),
            'co2_saved': round(total_waste * 0.35 * 0.85 * 0.8, 1)
        },
        'paper': {
            'collected_kg': round(total_waste * 0.15, 1),
            'recycled_kg': round(total_waste * 0.15 * 0.80, 1),
            'recovery_rate': 80,
            'destination': 'Paper Pulp Factory - North',
            'revenue': round(total_waste * 0.15 * 0.80 * 8, 0),
            'co2_saved': round(total_waste * 0.15 * 0.80 * 1.2, 1)
        },
        'metal': {
            'collected_kg': round(total_waste * 0.08, 1),
            'recycled_kg': round(total_waste * 0.08 * 0.92, 1),
            'recovery_rate': 92,
            'destination': 'Industrial Metal Smelter',
            'revenue': round(total_waste * 0.08 * 0.92 * 45, 0),
            'co2_saved': round(total_waste * 0.08 * 0.92 * 3.5, 1)
        },
        'glass': {
            'collected_kg': round(total_waste * 0.05, 1),
            'recycled_kg': round(total_waste * 0.05 * 0.65, 1),
            'recovery_rate': 65,
            'destination': 'Glass Processing unit',
            'revenue': round(total_waste * 0.05 * 0.65 * 10, 0),
            'co2_saved': round(total_waste * 0.05 * 0.65 * 0.5, 1)
        },
    }

    total_recycled = sum([v.get('recycled_kg', v.get('composted_kg', 0)) for v in recovery.values()])
    total_revenue = sum([v['revenue'] for v in recovery.values()])
    total_co2 = sum([v['co2_saved'] for v in recovery.values()])

    monthly_trend = {
        'months': ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
        'recycled': [1200, 1450, 1320, 1580, 1720, 1850],
        'composted': [800, 950, 880, 1050, 1120, 1200],
        'landfill': [600, 550, 580, 520, 480, 450]
    }

    ai_suggestions = [
        {
            'material': '♻️ High-Density Plastic',
            'action': 'Redirect to Unit 4 Smelter',
            'quantity': '450 kg',
            'urgency': 'high',
            'reason': 'Optimal processing temperature reached at Unit 4'
        },
        {
            'material': '🌱 Organic Waste',
            'action': 'Accelerate Composting Cycle',
            'quantity': '1.2 Tons',
            'urgency': 'medium',
            'reason': 'Moisture levels optimal for microbial activity'
        },
        {
            'material': '📦 Corrugated Cardboard',
            'action': 'Shift to Secondary Pulp Line',
            'quantity': '800 kg',
            'urgency': 'low',
            'reason': 'Primary line near capacity; secondary line open'
        }
    ]

    return jsonify({
        'totalWaste': round(total_waste, 1),
        'totalRecycled': round(total_recycled, 1),
        'recyclingRate': round(total_recycled / total_waste * 100, 1) if total_waste > 0 else 0,
        'totalRevenue': round(total_revenue),
        'totalCO2Saved': round(total_co2, 1),
        'recovery': recovery,
        'monthlyTrend': monthly_trend,
        'aiSuggestions': ai_suggestions
    })
