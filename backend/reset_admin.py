from passlib.context import CryptContext
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "canteenly")

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)

client = MongoClient(MONGODB_URI)
db = client[DATABASE_NAME]

admins = db["admins"]

new_password = "admin123"
new_hash = pwd_context.hash(new_password)

result = admins.update_one(
    {
        "email": "admin@canteenly.com"
    },
    {
        "$set": {
            "password": new_hash
        }
    }
)

print("Matched:", result.matched_count)
print("Modified:", result.modified_count)
print("New hash:", new_hash)

if result.matched_count == 1:
    print("Password admin berhasil direset menjadi admin123")
else:
    print("Admin tidak ditemukan")