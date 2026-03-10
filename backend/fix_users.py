from app.db import get_db

db = get_db()

# Rename username -> name, reports_count -> reports for all users
users = db.users.find({})
for user in users:
    update_fields = {}
    unset_fields = {}
    
    if 'username' in user and 'name' not in user:
        update_fields['name'] = user['username']
        unset_fields['username'] = ""
    
    if 'reports_count' in user and 'reports' not in user:
        update_fields['reports'] = user['reports_count']
        unset_fields['reports_count'] = ""
        
    if 'level' not in user:
        update_fields['level'] = 'Bronze'
        
    if update_fields:
        op = {'$set': update_fields}
        if unset_fields:
            op['$unset'] = unset_fields
        db.users.update_one({'_id': user['_id']}, op)
        print(f"Updated user: {user.get('username') or user.get('name')}")

print("Migration complete!")
