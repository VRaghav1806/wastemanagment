from flask import Blueprint, request, jsonify
import random
import time
from datetime import datetime
from app.utils.data_manager import load_bins, save_bins
from app.utils.helpers import get_status

bins_bp = Blueprint('bins', __name__)

@bins_bp.route('/api/bins', methods=['GET'])
def get_bins():
    bins = load_bins()
    status_filter = request.args.get('status')
    zone_filter = request.args.get('zone')
    if status_filter and status_filter != 'all':
        bins = [b for b in bins if b['status'] == status_filter]
    if zone_filter and zone_filter != 'all':
        bins = [b for b in bins if b['zone'] == zone_filter]
    return jsonify(bins)

@bins_bp.route('/api/bins', methods=['POST'])
def add_bin():
    data = request.json
    bins = load_bins()
    new_id = max(b['id'] for b in bins) + 1 if bins else 1
    new_bin = {
        'id': new_id,
        'name': data.get('name', f'Bin #{new_id}'),
        'location': data.get('location', 'Unknown'),
        'lat': float(data.get('lat', 11.0168 + random.uniform(-0.04, 0.04))),
        'lng': float(data.get('lng', 76.9558 + random.uniform(-0.04, 0.04))),
        'fillLevel': int(data.get('fillLevel', 0)),
        'lastCleaned': datetime.now().isoformat(),
        'wasteType': data.get('wasteType', 'Mixed'),
        'zone': data.get('zone', 'Zone 1'),
        'status': get_status(int(data.get('fillLevel', 0)))
    }
    bins.append(new_bin)
    save_bins(bins)
    return jsonify(new_bin), 201

@bins_bp.route('/api/bins/<int:bin_id>', methods=['PUT'])
def update_bin(bin_id):
    bins = load_bins()
    for b in bins:
        if b['id'] == bin_id:
            for key in ['name', 'location', 'lat', 'lng', 'fillLevel', 'wasteType', 'zone']:
                if key in request.json:
                    b[key] = request.json[key]
            b['fillLevel'] = int(b['fillLevel'])
            b['status'] = get_status(b['fillLevel'])
            save_bins(bins)
            return jsonify(b)
    return jsonify({'error': 'Bin not found'}), 404

@bins_bp.route('/api/bins/<int:bin_id>', methods=['DELETE'])
def delete_bin(bin_id):
    bins = load_bins()
    bins = [b for b in bins if b['id'] != bin_id]
    save_bins(bins)
    return jsonify({'message': 'Bin deleted'})

@bins_bp.route('/api/analyze-photo', methods=['POST'])
def analyze_photo():
    if 'photo' not in request.files:
        return jsonify({'error': 'No photo uploaded'}), 400

    # Simulate AI processing delay
    time.sleep(1.5)

    # Simulate AI analysis result
    fill_level = random.randint(15, 98)
    waste_types_detected = random.sample(
        ['Plastic', 'Paper', 'Organic', 'Metal', 'Glass', 'E-Waste', 'Textile'],
        k=random.randint(1, 3)
    )
    confidence = round(random.uniform(0.82, 0.99), 2)

    return jsonify({
        'fillLevel': fill_level,
        'status': get_status(fill_level),
        'wasteTypesDetected': waste_types_detected,
        'confidence': confidence,
        'recommendation': 'Immediate collection needed' if fill_level >= 80
                          else 'Schedule collection soon' if fill_level >= 60
                          else 'No action needed',
        'analysisTime': '1.5s'
    })
