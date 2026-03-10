import json
import os
import sys
from pymongo import MongoClient

# Add the backend directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db import get_db
from app.utils.data_manager import eco_points_users

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
BINS_FILE = os.path.join(DATA_DIR, 'bins.json')
REPORTS_FILE = os.path.join(DATA_DIR, 'reports.json')

def migrate_bins(db):
    print("Migrating bins...")
    if os.path.exists(BINS_FILE):
        with open(BINS_FILE, 'r') as f:
            bins = json.load(f)
            if bins:
                # Clear existing collection and insert new data
                db.bins.delete_many({})
                db.bins.insert_many(bins)
                print(f"Successfully migrated {len(bins)} bins.")
            else:
                print("No bins found in JSON file.")
    else:
        print("Bins JSON file not found.")

def migrate_reports(db):
    print("Migrating reports...")
    if os.path.exists(REPORTS_FILE):
        with open(REPORTS_FILE, 'r') as f:
            reports = json.load(f)
            if reports:
                # Clear existing collection and insert new data
                db.reports.delete_many({})
                db.reports.insert_many(reports)
                print(f"Successfully migrated {len(reports)} reports.")
            else:
                print("No reports found in JSON file.")
    else:
        print("Reports JSON file not found.")

def migrate_users(db):
    print("Migrating users...")
    if eco_points_users:
        # Clear existing collection and insert new data
        db.users.delete_many({})
        db.users.insert_many(eco_points_users)
        print(f"Successfully migrated {len(eco_points_users)} users.")
    else:
        print("No users found in in-memory list.")

if __name__ == "__main__":
    db = get_db()
    migrate_bins(db)
    migrate_reports(db)
    migrate_users(db)
    print("Migration complete!")
