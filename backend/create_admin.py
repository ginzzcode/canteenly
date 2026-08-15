
import os

from dotenv import load_dotenv
from passlib.context import CryptContext
from pymongo import MongoClient


# =========================================================
# ENVIRONMENT
# =========================================================

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = os.getenv(
    "DATABASE_NAME",
    "canteenly",
)

if not MONGODB_URI:
    raise RuntimeError(
        "MONGODB_URI belum diatur di file .env"
    )


# =========================================================
# DATABASE
# =========================================================

client = MongoClient(MONGODB_URI)
db = client[DATABASE_NAME]

admins_collection = db["admins"]


# =========================================================
# PASSWORD
# =========================================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


# =========================================================
# ADMIN DATA
# =========================================================

email = "admin@canteenly.com"
password = "Admin123"
name = "Administrator"


# =========================================================
# CHECK EXISTING ADMIN
# =========================================================

existing_admin = admins_collection.find_one(
    {
        "email": email,
    }
)

if existing_admin:
    admins_collection.update_one(
        {
            "_id": existing_admin["_id"],
        },
        {
            "$set": {
                "name": name,
                "email": email,
                "password": pwd_context.hash(password),
            }
        },
    )

    print("Admin sudah ada.")
    print("Password admin berhasil diperbarui.")
    print("Email:", email)
    print("Password:", password)

else:
    admins_collection.insert_one(
        {
            "name": name,
            "email": email,
            "password": pwd_context.hash(password),
        }
    )

    print("Admin berhasil dibuat.")
    print("Email:", email)
    print("Password:", password)
