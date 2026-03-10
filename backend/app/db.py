import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# MongoDB Configuration
MONGO_URL = os.getenv('MONGO_URL', os.getenv('MONGO_URI', 'mongodb://localhost:27017/'))
DB_NAME = os.getenv('DB_NAME', 'waste_management_db')

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

def get_db():
    return db
