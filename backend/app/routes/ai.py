from flask import Blueprint, request, jsonify
import random
import time
import os
from datetime import datetime
from groq import Groq
from app.utils.data_manager import load_bins, get_eco_points_users

ai_bp = Blueprint('ai', __name__)

# Initialize Groq Client
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

@ai_bp.route('/waste-recognition', methods=['POST'])
def waste_recognition():
    if 'photo' not in request.files:
        return jsonify({'error': 'No photo uploaded'}), 400

    time.sleep(1.8)

    # Simulate detailed waste composition analysis
    waste_categories = {
        'Plastic': round(random.uniform(5, 45), 1),
        'Organic': round(random.uniform(10, 40), 1),
        'Paper': round(random.uniform(5, 25), 1),
        'Metal': round(random.uniform(2, 15), 1),
        'Glass': round(random.uniform(1, 12), 1),
    }
    # Normalize to 100%
    total = sum(waste_categories.values())
    waste_categories = {k: round(v / total * 100, 1) for k, v in waste_categories.items()}

    recycling_instructions = {
        'Plastic': {
            'recyclable': True,
            'instruction': 'Clean and flatten plastic containers. Remove caps. Send to plastic recycling unit.',
            'destination': 'Plastic Recycling Plant - Unit 3',
            'value_per_kg': round(random.uniform(8, 22), 1)
        },
        'Organic': {
            'recyclable': True,
            'instruction': 'Separate food waste from garden waste. Ideal for composting.',
            'destination': 'City Compost Center - Section B',
            'value_per_kg': round(random.uniform(3, 8), 1)
        },
        'Paper': {
            'recyclable': True,
            'instruction': 'Keep dry. Remove staples and plastic windows. Bundle together.',
            'destination': 'Paper Mill - Recycling Division',
            'value_per_kg': round(random.uniform(6, 15), 1)
        },
        'Metal': {
            'recyclable': True,
            'instruction': 'Separate ferrous and non-ferrous metals. Clean cans thoroughly.',
            'destination': 'Metal Scrap Yard - Processing Unit',
            'value_per_kg': round(random.uniform(25, 65), 1)
        },
        'Glass': {
            'recyclable': True,
            'instruction': 'Sort by color. Remove lids. Do not crush.',
            'destination': 'Glass Recycling Facility',
            'value_per_kg': round(random.uniform(4, 12), 1)
        },
    }

    overall_recyclability = round(random.uniform(65, 95), 1)
    confidence = round(random.uniform(0.85, 0.98), 2)

    return jsonify({
        'composition': waste_categories,
        'recyclingInstructions': recycling_instructions,
        'overallRecyclability': overall_recyclability,
        'confidence': confidence,
        'totalWeight': f"{round(random.uniform(2, 25), 1)} kg",
        'estimatedValue': f"₹{random.randint(50, 500)}",
        'analysisTime': '1.8s',
        'circularEconomyScore': round(random.uniform(60, 95), 1)
    })

@ai_bp.route('/assistant', methods=['POST'])
def assistant():
    query = request.json.get('message', '').strip()
    if not query:
        return jsonify({'response': "I'm sorry, I didn't catch that. How can I help you today?"}), 400

    bins = load_bins()
    users = get_eco_points_users()
    
    # Temporal Awareness
    now = datetime.now()
    today_date = now.strftime("%Y-%m-%d")
    today_day = now.strftime("%A")
    is_weekend = today_day in ["Saturday", "Sunday"]
    
    # System Context with Project Data
    system_prompt = f"""
    You are the AI Assistant for the 'AI-Driven Circular Waste Intelligence Platform'. 
    Your goal is to help users manage urban waste efficiently.
    
    CURRENT DATE: {today_date}
    CURRENT DAY: {today_day} ({'Weekend' if is_weekend else 'Weekday'})
    
    PROJECT CONTEXT:
    - This platform monitors waste bins in Coimbatore.
    - It uses AI for waste recognition from photos, route optimization, and hotspot prediction.
    - It includes a circular economy dashboard and citizen reward system (Eco-Points).
    
    CURRENT BIN STATUS:
    {[{'name': b['name'], 'fill': b['fillLevel'], 'location': b['location']} for b in bins]}
    
    TOP CITIZENS (Eco-Points):
    {[{'name': u['name'], 'points': u['points']} for u in users[:5]]}
    
    GUIDELINES:
    1. ONLY answer questions related to this waste management project and its data.
    2. If a question is NOT about the project, politely inform the user that you are specialized in waste management only.
    3. Be professional, helpful, and concise.
    4. Use the provided data to give specific answers.
    5. Always keep the current date and day in mind for scheduling or pattern-related queries.
    6. Format your responses with Markdown for better readability (bullets, bold text, etc.).
    """

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            temperature=0.7,
            max_tokens=500,
            top_p=1,
            stream=False,
            stop=None,
        )
        response = completion.choices[0].message.content
    except Exception as e:
        print(f"Error calling Groq API: {e}")
        response = "I'm having trouble connecting to my brain right now. Please try again in a moment."

    return jsonify({
        'response': response,
        'timestamp': datetime.now().isoformat()
    })

@ai_bp.route('/suggestions', methods=['GET'])
def get_ai_suggestions():
    # Route for general AI suggestions/tips used across the app
    now = datetime.now()
    context = f"Today is {now.strftime('%A')}, {now.strftime('%B %d, %Y')}."
    
    prompt = f"Given {context}, provide 3 short, catchy AI-powered waste management tips or suggestions for a circular economy smart city dashboard."
    
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a smart city waste management expert."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
            max_tokens=200
        )
        suggestions = completion.choices[0].message.content
    except:
        suggestions = "• Keep it green!\n• Recycle today!\n• Minimize waste."
        
    return jsonify({'suggestions': suggestions})
