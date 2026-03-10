import os
from app.db import get_db

db = get_db()

def load_bins():
    """Load all bins from MongoDB."""
    return list(db.bins.find({}, {'_id': 0}))

def save_bins(bins):
    """Save/Update bins in MongoDB."""
    # This is a bit complex for a simple save_bins. Usually we'd update specific bins.
    # For now, to match the previous behavior, we'll replace the entire collection.
    if bins:
        db.bins.delete_many({})
        db.bins.insert_many(bins)

def load_reports():
    """Load all reports from MongoDB."""
    return list(db.reports.find({}, {'_id': 0}).sort('timestamp', -1))

def save_reports(reports):
    """Save/Update reports in MongoDB."""
    if reports:
        try:
            # Match previous behavior: replace entire collection
            db.reports.delete_many({})
            db.reports.insert_many(reports)
            print(f"DEBUG: Successfully saved {len(reports)} reports to MongoDB.")
        except Exception as e:
            print(f"ERROR: Failed to save reports to MongoDB: {e}")
            raise e

def get_eco_points_users():
    """Load all users from MongoDB."""
    return list(db.users.find({}, {'_id': 0}).sort('points', -1))

def register_user(user_data):
    """Register a new user in MongoDB."""
    # Check if user already exists
    if db.users.find_one({'name': user_data['username']}):
        return None
    
    # Set default values
    new_user = {
        'name': user_data['username'],
        'email': user_data.get('email', ''),
        'points': 0,
        'level': 'Bronze',
        'recycled_kg': 0,
        'reports': 0,
        'avatar': f'https://api.dicebear.com/7.x/avataaars/svg?seed={user_data["username"]}',
        'joined': user_data.get('joined', '')
    }
    
    db.users.insert_one(new_user)
    # Remove _id from return value for JSON serialization
    if '_id' in new_user:
        new_user.pop('_id')
    return new_user

def update_user_stats(username, points_to_add):
    """Update user's points and reports count."""
    db.users.update_one(
        {'name': username},
        {
            '$inc': {
                'points': points_to_add,
                'reports': 1
            }
        }
    )

# For backward compatibility if needed, but we should use get_eco_points_users()
eco_points_users = get_eco_points_users()
