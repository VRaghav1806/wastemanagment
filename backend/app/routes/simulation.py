from flask import Blueprint, request, jsonify
import random
import time
from datetime import datetime
from app.utils.data_manager import load_bins

simulation_bp = Blueprint('simulation', __name__)

@simulation_bp.route('/api/digital-twin/simulate', methods=['POST'])
def digital_twin_simulate():
    data = request.json
    bins = load_bins()
    scenario = data.get('scenario', 'add_bins')
    params = data.get('params', {})

    time.sleep(1.2)

    if scenario == 'add_bins':
        new_count = int(params.get('count', 5))
        zone = params.get('zone', 'North Zone')
        current_bins_in_zone = sum(1 for b in bins if b['zone'] == zone)
        new_total = current_bins_in_zone + new_count
        coverage_before = min(current_bins_in_zone * 12, 100)
        coverage_after = min(new_total * 12, 100)

        result = {
            'scenario': 'Add Bins',
            'description': f'Adding {new_count} smart bins to {zone}',
            'metrics': {
                'coverageChange': f"+{coverage_after - coverage_before}%",
                'costChange': f"+₹{new_count * 8500}/month",
            },
            'before': {'bins': current_bins_in_zone, 'coverage': f"{coverage_before}%"},
            'after': {'bins': new_total, 'coverage': f"{coverage_after}%"},
            'recommendation': f'Recommended to improve coverage by {coverage_after - coverage_before}%.'
        }
    elif scenario == 'traffic_impact':
        congestion = params.get('congestion', 'moderate')
        delay_map = {'low': 5, 'moderate': 30, 'high': 65, 'severe': 120}
        delay_pct = delay_map.get(congestion, 30)
        
        fuel_increase = round(delay_pct * 0.4, 1)
        time_increase = delay_pct
        
        result = {
            'scenario': 'Traffic Impact',
            'description': f'Analyzing {congestion} congestion effects on collection routes',
            'metrics': {
                'avgDelay': f"+{time_increase} mins/route",
                'fuelConsumption': f"+{fuel_increase}%",
                'efficiencyDrop': f"-{round(delay_pct * 0.25, 1)}%"
            },
            'before': {'avgTime': '45 mins', 'fuelUse': '12L/route'},
            'after': {'avgTime': f'{45 + time_increase} mins', 'fuelUse': f'{round(12 * (1 + fuel_increase/100), 1)}L/route'},
            'recommendation': 'Dynamic rerouting suggested to bypass high congestion zones.' if delay_pct > 50 else 'Current routes are manageable with minor adjustments.'
        }
    elif scenario == 'vehicle_allocation':
        vehicles = int(params.get('vehicles', 4))
        base_vehicles = 4
        efficiency = min(100, (vehicles / base_vehicles) * 85)
        cost = vehicles * 15000 # Monthly cost per vehicle
        
        result = {
            'scenario': 'Vehicle Allocation',
            'description': f'Optimizing fleet size with {vehicles} vehicles',
            'metrics': {
                'collectionEfficiency': f"{round(efficiency, 1)}%",
                'estimatedMonthlyCost': f"₹{cost}",
                'capacityUtilization': f"{max(40, 100 - (vehicles * 5))}%"
            },
            'before': {'fleetSize': 4, 'efficiency': '85%'},
            'after': {'fleetSize': vehicles, 'efficiency': f'{round(efficiency, 1)}%'},
            'recommendation': 'Increasing fleet size improves coverage but increases operational costs.' if vehicles > 4 else 'Optimizing existing fleet is recommended over adding new vehicles.'
        }
    else:
        result = {'scenario': 'Unknown', 'metrics': {}, 'recommendation': 'No scenario selected.'}

    grid_data = [{'id': b['id'], 'name': b['name'], 'lat': b['lat'], 'lng': b['lng'], 'fillLevel': b['fillLevel']} for b in bins]
    result['gridData'] = grid_data
    result['timestamp'] = datetime.now().isoformat()

    return jsonify(result)
