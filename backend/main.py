# REWRITE PENUH main.py
# Versi ini mempertahankan endpoint lama dan menambahkan
# admin dashboard + seller management + active/inactive seller.

import os
import random
from datetime import datetime, timedelta, timezone

import jwt
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError


# =========================================================
# ENVIRONMENT
# =========================================================

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "canteenly")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

if not MONGODB_URI:
    raise RuntimeError("MONGODB_URI belum diatur di file .env")

if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY belum diatur di file .env")


# =========================================================
# DATABASE
# =========================================================

client = MongoClient(MONGODB_URI)

db = client[DATABASE_NAME]

admins_collection = db["admins"]
sellers_collection = db["sellers"]
menus_collection = db["menus"]
orders_collection = db["orders"]


# =========================================================
# SECURITY
# =========================================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)

JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24

security = HTTPBearer()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:

    if not plain_password or not hashed_password:
        return False

    try:
        return pwd_context.verify(
            plain_password,
            hashed_password,
        )

    except Exception as error:
        print("Password verification error:", error)
        return False


# =========================================================
# SELLER JWT
# =========================================================

def create_access_token(seller_id: str) -> str:

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=JWT_EXPIRE_MINUTES
    )

    payload = {
        "sub": seller_id,
        "role": "seller",
        "exp": expire,
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


def get_current_seller(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):

    token = credentials.credentials

    try:

        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )

        seller_id = payload.get("sub")
        role = payload.get("role")

        if not seller_id or role != "seller":

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token seller tidak valid",
            )

    except jwt.ExpiredSignatureError:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sudah kedaluwarsa",
        )

    except jwt.InvalidTokenError:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid",
        )

    if not ObjectId.is_valid(seller_id):

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Seller tidak valid",
        )

    seller = sellers_collection.find_one(
        {
            "_id": ObjectId(seller_id),
        }
    )

    if not seller:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Seller tidak ditemukan",
        )

    # Seller lama yang belum memiliki is_active
    # dianggap aktif.
    if seller.get("is_active", True) is False:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun seller sedang dinonaktifkan oleh administrator.",
        )

    return seller


# =========================================================
# ADMIN JWT
# =========================================================

def create_admin_access_token(admin_id: str) -> str:

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=JWT_EXPIRE_MINUTES
    )

    payload = {
        "sub": admin_id,
        "role": "admin",
        "exp": expire,
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):

    token = credentials.credentials

    try:

        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )

        admin_id = payload.get("sub")
        role = payload.get("role")

        if not admin_id or role != "admin":

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token admin tidak valid",
            )

    except jwt.ExpiredSignatureError:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sudah kedaluwarsa",
        )

    except jwt.InvalidTokenError:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid",
        )

    if not ObjectId.is_valid(admin_id):

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin tidak valid",
        )

    admin = admins_collection.find_one(
        {
            "_id": ObjectId(admin_id),
        }
    )

    if not admin:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin tidak ditemukan",
        )

    return admin


# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(
    title="Canteenly API",
    description="Backend Smart Canteen",
    version="3.0.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# MODELS
# =========================================================

class AdminLogin(BaseModel):
    email: str
    password: str


class SellerRegister(BaseModel):

    name: str = Field(
        min_length=2,
        max_length=100,
    )

    store_name: str = Field(
        min_length=2,
        max_length=100,
    )

    email: str = Field(
        min_length=5,
        max_length=150,
    )

    password: str = Field(
        min_length=6,
        max_length=100,
    )


class SellerLogin(BaseModel):
    email: str
    password: str


class SellerPasswordChange(BaseModel):

    current_password: str = Field(
        min_length=1,
        max_length=100,
    )

    new_password: str = Field(
        min_length=6,
        max_length=100,
    )


class SellerProfileUpdate(BaseModel):

    name: str = Field(
        min_length=2,
        max_length=100,
    )

    store_name: str = Field(
        min_length=2,
        max_length=100,
    )

    email: str = Field(
        min_length=5,
        max_length=150,
    )

    store_description: str = Field(
        default="",
        max_length=500,
    )

    store_open: bool = True

    profile_image: str | None = Field(
        default=None,
        max_length=5_000_000,
    )

    banner_image: str | None = Field(
        default=None,
        max_length=5_000_000,
    )


class SellerStatusUpdate(BaseModel):
    is_active: bool


class MenuCreate(BaseModel):

    name: str = Field(
        min_length=1,
        max_length=100,
    )

    category: str = Field(
        min_length=1,
        max_length=50,
    )

    price: int = Field(
        ge=0,
    )

    description: str = Field(
        default="",
        max_length=500,
    )

    emoji: str = Field(
        default="🍽️",
        max_length=10,
    )

    image: str | None = None

    is_available: bool = True


class MenuUpdate(BaseModel):

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    category: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )

    price: int | None = Field(
        default=None,
        ge=0,
    )

    description: str | None = Field(
        default=None,
        max_length=500,
    )

    emoji: str | None = Field(
        default=None,
        max_length=10,
    )

    image: str | None = None

    is_available: bool | None = None


class OrderItemCreate(BaseModel):

    menu_id: str

    quantity: int = Field(
        ge=1,
        le=99,
    )


class OrderCreate(BaseModel):

    seller_id: str

    customer_name: str = Field(
        min_length=1,
        max_length=100,
    )

    customer_class: str = Field(
        min_length=1,
        max_length=50,
    )

    items: list[OrderItemCreate] = Field(
        min_length=1,
        max_length=50,
    )


class OrderStatusUpdate(BaseModel):
    status: str


# =========================================================
# CONSTANTS
# =========================================================

ALLOWED_ORDER_STATUSES = {
    "Menunggu",
    "Diproses",
    "Siap diambil",
    "Selesai",
    "Dibatalkan",
}


# =========================================================
# SERIALIZERS
# =========================================================

def serialize_admin(admin):

    return {
        "id": str(admin["_id"]),
        "name": admin.get("name", ""),
        "email": admin.get("email", ""),
    }


def serialize_seller(seller):

    store_name = seller.get(
        "store_name",
        "Kantin",
    )

    store_description = seller.get(
        "store_description",
        "",
    )

    store_open = seller.get(
        "store_open",
        True,
    )

    profile_image = seller.get("profile_image")
    banner_image = seller.get("banner_image")

    is_active = seller.get(
        "is_active",
        True,
    )

    return {

        "id": str(seller["_id"]),

        "name": seller.get(
            "name",
            "",
        ),

        "store_name": store_name,
        "storeName": store_name,

        "email": seller.get(
            "email",
            "",
        ),

        "store_description": store_description,
        "storeDescription": store_description,

        "store_open": store_open,
        "storeOpen": store_open,

        "is_active": is_active,
        "isActive": is_active,

        "profile_image": profile_image,
        "profileImage": profile_image,

        "banner_image": banner_image,
        "bannerImage": banner_image,

        "created_at": (
            seller["created_at"].isoformat()
            if seller.get("created_at")
            else None
        ),

        "updated_at": (
            seller["updated_at"].isoformat()
            if seller.get("updated_at")
            else None
        ),
    }


def serialize_menu(menu):

    seller_id = menu.get("seller_id")
    created_at = menu.get("created_at")
    updated_at = menu.get("updated_at")

    return {

        "id": str(menu["_id"]),

        "seller_id": (
            str(seller_id)
            if seller_id
            else None
        ),

        "name": menu.get(
            "name",
            "",
        ),

        "category": menu.get(
            "category",
            "",
        ),

        "price": menu.get(
            "price",
            0,
        ),

        "description": menu.get(
            "description",
            "",
        ),

        "emoji": menu.get(
            "emoji",
            "🍽️",
        ),

        "image": menu.get("image"),

        "is_available": menu.get(
            "is_available",
            True,
        ),

        "created_at": (
            created_at.isoformat()
            if created_at
            else None
        ),

        "updated_at": (
            updated_at.isoformat()
            if updated_at
            else None
        ),
    }


def seller_order_filter(seller_id):

    seller_id_string = str(seller_id)

    return {
        "$or": [
            {
                "seller_id": seller_id,
            },
            {
                "seller_id": seller_id_string,
            },
        ]
    }


def build_notification(order):

    status_value = order.get(
        "status",
        "Menunggu",
    )

    code = order.get(
        "code",
        "-",
    )

    notification_map = {

        "Diproses": {
            "type": "processing",
            "title": "Pesanan sedang diproses",
            "message": f"Pesanan {code} sedang diproses.",
        },

        "Siap diambil": {
            "type": "ready",
            "title": "Pesanan siap diambil",
            "message": f"Pesanan {code} sudah siap diambil.",
        },

        "Selesai": {
            "type": "completed",
            "title": "Pesanan selesai",
            "message": f"Pesanan {code} sudah selesai.",
        },

        "Dibatalkan": {
            "type": "cancelled",
            "title": "Pesanan dibatalkan",
            "message": f"Pesanan {code} telah dibatalkan.",
        },
    }

    notification = notification_map.get(
        status_value
    )

    if not notification:
        return None

    last_status_change = order.get(
        "last_status_change"
    )

    return {
        **notification,
        "status": status_value,
        "changed_at": (
            last_status_change.isoformat()
            if last_status_change
            else None
        ),
    }


def serialize_order(order):

    created_at = order.get("created_at")
    updated_at = order.get("updated_at")
    last_status_change = order.get(
        "last_status_change"
    )

    status_value = order.get(
        "status",
        "Menunggu",
    )

    seller_id = order.get("seller_id")

    time_value = "-"

    if created_at:

        if created_at.tzinfo is None:
            created_at = created_at.replace(
                tzinfo=timezone.utc
            )

        time_value = created_at.astimezone(
            timezone.utc
        ).strftime("%H:%M")

    return {

        "id": str(order["_id"]),

        "code": order.get(
            "code",
            "-",
        ),

        "seller_id": (
            str(seller_id)
            if seller_id
            else None
        ),

        "seller_name": order.get(
            "seller_name",
            "Kantin",
        ),

        "customer": order.get(
            "customer_name",
            "Siswa",
        ),

        "className": order.get(
            "customer_class",
            "-",
        ),

        "items": order.get(
            "items",
            [],
        ),

        "total": order.get(
            "total",
            0,
        ),

        "status": status_value,

        "time": time_value,

        "created_at": (
            created_at.isoformat()
            if created_at
            else None
        ),

        "updated_at": (
            updated_at.isoformat()
            if updated_at
            else None
        ),

        "last_status_change": (
            last_status_change.isoformat()
            if last_status_change
            else None
        ),

        "notification": build_notification(
            order
        ),
    }


# =========================================================
# HELPERS
# =========================================================

def generate_order_code():

    characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

    for _ in range(100):

        code = "SC-" + "".join(
            random.choice(characters)
            for _ in range(4)
        )

        if not orders_collection.find_one(
            {
                "code": code,
            }
        ):
            return code

    raise HTTPException(
        status_code=500,
        detail="Gagal membuat kode pesanan unik.",
    )


def get_seller_by_id(
    seller_id: str,
    require_active: bool = True,
):

    if not ObjectId.is_valid(seller_id):

        raise HTTPException(
            status_code=400,
            detail="ID seller tidak valid",
        )

    seller = sellers_collection.find_one(
        {
            "_id": ObjectId(seller_id),
        }
    )

    if not seller:

        raise HTTPException(
            status_code=404,
            detail="Toko tidak ditemukan",
        )

    if (
        require_active
        and seller.get("is_active", True) is False
    ):

        raise HTTPException(
            status_code=403,
            detail="Toko sedang dinonaktifkan.",
        )

    return seller


# =========================================================
# BASIC
# =========================================================

@app.get("/")
def root():

    return {
        "message": "Canteenly API is running",
        "database": DATABASE_NAME,
        "version": "3.0.0",
    }


@app.get("/health")
def health():

    try:

        client.admin.command("ping")

        return {
            "status": "ok",
            "database": "connected",
        }

    except Exception as error:

        return {
            "status": "error",
            "database": "disconnected",
            "detail": str(error),
        }


# =========================================================
# ADMIN LOGIN
# =========================================================

@app.post("/api/admin/login")
def login_admin(data: AdminLogin):

    email = data.email.strip().lower()

    admin = admins_collection.find_one(
        {
            "email": email,
        }
    )

    if not admin:

        raise HTTPException(
            status_code=401,
            detail="Email atau password salah",
        )

    if not verify_password(
        data.password,
        admin.get("password", ""),
    ):

        raise HTTPException(
            status_code=401,
            detail="Email atau password salah",
        )

    token = create_admin_access_token(
        str(admin["_id"])
    )

    return {

        "message": "Login admin berhasil",

        "access_token": token,

        "token_type": "bearer",

        "admin": serialize_admin(admin),
    }


# =========================================================
# ADMIN ME
# =========================================================

@app.get("/api/admin/me")
def get_my_admin(
    admin=Depends(get_current_admin),
):

    return {
        "admin": serialize_admin(admin)
    }


# =========================================================
# ADMIN DASHBOARD
# =========================================================

@app.get("/api/admin/dashboard")
def admin_dashboard(
    admin=Depends(get_current_admin),
):

    total_sellers = sellers_collection.count_documents(
        {}
    )

    active_sellers = sellers_collection.count_documents(
        {
            "$or": [
                {
                    "is_active": True,
                },
                {
                    "is_active": {
                        "$exists": False,
                    }
                },
            ]
        }
    )

    inactive_sellers = sellers_collection.count_documents(
        {
            "is_active": False,
        }
    )

    total_menus = menus_collection.count_documents(
        {}
    )

    total_orders = orders_collection.count_documents(
        {}
    )

    completed_orders = orders_collection.find(
        {
            "status": "Selesai",
        }
    )

    total_income = sum(
        order.get("total", 0)
        for order in completed_orders
    )

    return {

        "stats": {

            "total_sellers": total_sellers,

            "active_sellers": active_sellers,

            "inactive_sellers": inactive_sellers,

            "total_menus": total_menus,

            "total_orders": total_orders,

            "total_income": total_income,
        }
    }


# =========================================================
# ADMIN SELLER LIST
# =========================================================

@app.get("/api/admin/sellers")
def admin_get_sellers(
    admin=Depends(get_current_admin),
):

    sellers = sellers_collection.find(
        {},
        {
            "password": 0,
        },
    ).sort(
        "created_at",
        -1,
    )

    return {
        "sellers": [
            serialize_seller(seller)
            for seller in sellers
        ]
    }


# =========================================================
# ADMIN UPDATE SELLER STATUS
# =========================================================

@app.put("/api/admin/sellers/{seller_id}/status")
def admin_update_seller_status(
    seller_id: str,
    data: SellerStatusUpdate,
    admin=Depends(get_current_admin),
):

    if not ObjectId.is_valid(seller_id):

        raise HTTPException(
            status_code=400,
            detail="ID seller tidak valid",
        )

    seller_object_id = ObjectId(seller_id)

    seller = sellers_collection.find_one(
        {
            "_id": seller_object_id,
        }
    )

    if not seller:

        raise HTTPException(
            status_code=404,
            detail="Seller tidak ditemukan",
        )

    now = datetime.now(timezone.utc)

    result = sellers_collection.update_one(
        {
            "_id": seller_object_id,
        },
        {
            "$set": {
                "is_active": data.is_active,
                "updated_at": now,
            }
        },
    )

    if result.matched_count == 0:

        raise HTTPException(
            status_code=404,
            detail="Seller tidak ditemukan",
        )

    updated_seller = sellers_collection.find_one(
        {
            "_id": seller_object_id,
        }
    )

    # Jika seller dinonaktifkan,
    # semua menu seller ikut tidak tersedia
    # di menu publik.
    if data.is_active is False:

        menus_collection.update_many(
            {
                "seller_id": seller_object_id,
            },
            {
                "$set": {
                    "is_available": False,
                    "updated_at": now,
                }
            },
        )

    return {

        "message": (
            "Seller berhasil diaktifkan."
            if data.is_active
            else "Seller berhasil dinonaktifkan."
        ),

        "seller": serialize_seller(
            updated_seller
        ),
    }


# =========================================================
# PUBLIC MENU
# =========================================================

@app.get("/api/menu")
def get_public_menu():

    menus = list(
        menus_collection.find(
            {
                "is_available": True,
            }
        ).sort(
            "created_at",
            -1,
        )
    )

    seller_ids = list(
        {
            menu["seller_id"]
            for menu in menus
            if isinstance(
                menu.get("seller_id"),
                ObjectId,
            )
        }
    )

    if not seller_ids:

        return {
            "stores": []
        }

    sellers = sellers_collection.find(
        {
            "_id": {
                "$in": seller_ids,
            },
            "$or": [
                {
                    "is_active": True,
                },
                {
                    "is_active": {
                        "$exists": False,
                    }
                },
            ],
        }
    )

    seller_map = {
        seller["_id"]: seller
        for seller in sellers
    }

    stores = {}

    for menu in menus:

        seller_id = menu.get("seller_id")

        seller = seller_map.get(
            seller_id
        )

        if not seller:
            continue

        seller_id_string = str(
            seller_id
        )

        if seller_id_string not in stores:

            stores[seller_id_string] = {

                "seller_id": seller_id_string,

                "store_name": seller.get(
                    "store_name",
                    "Kantin",
                ),

                "seller_name": seller.get(
                    "name",
                    "",
                ),

                "profile_image": seller.get(
                    "profile_image"
                ),

                "banner_image": seller.get(
                    "banner_image"
                ),

                "menus": [],
            }

        stores[
            seller_id_string
        ]["menus"].append(
            serialize_menu(menu)
        )

    return {
        "stores": list(
            stores.values()
        )
    }


# =========================================================
# PUBLIC STORES
# =========================================================

@app.get("/api/public/stores")
def get_public_stores():

    sellers = sellers_collection.find(
        {
            "$or": [
                {
                    "is_active": True,
                },
                {
                    "is_active": {
                        "$exists": False,
                    }
                },
            ]
        },
        {
            "password": 0,
        },
    )

    stores = []

    for seller in sellers:

        menus = menus_collection.find(
            {
                "seller_id": seller["_id"],
                "is_available": True,
            }
        ).sort(
            "created_at",
            -1,
        )

        serialized_menus = [
            serialize_menu(menu)
            for menu in menus
        ]

        if not serialized_menus:
            continue

        stores.append(
            {

                "id": str(
                    seller["_id"]
                ),

                "name": seller.get(
                    "name",
                    "",
                ),

                "store_name": seller.get(
                    "store_name",
                    "Kantin",
                ),

                "profile_image": seller.get(
                    "profile_image"
                ),

                "banner_image": seller.get(
                    "banner_image"
                ),

                "menus": serialized_menus,
            }
        )

    return {
        "stores": stores
    }


# =========================================================
# PUBLIC SINGLE STORE
# =========================================================

@app.get("/api/public/stores/{seller_id}")
def get_public_store(
    seller_id: str,
):

    seller = get_seller_by_id(
        seller_id,
        require_active=True,
    )

    menus = menus_collection.find(
        {
            "seller_id": seller["_id"],
            "is_available": True,
        }
    ).sort(
        "created_at",
        -1,
    )

    return {

        "store": {

            "id": str(
                seller["_id"]
            ),

            "name": seller.get(
                "name",
                "",
            ),

            "store_name": seller.get(
                "store_name",
                "Kantin",
            ),

            "profile_image": seller.get(
                "profile_image"
            ),

            "banner_image": seller.get(
                "banner_image"
            ),

            "menus": [
                serialize_menu(menu)
                for menu in menus
            ],
        }
    }


# =========================================================
# SELLER REGISTER
# =========================================================

@app.post("/api/sellers/register")
def register_seller(
    data: SellerRegister,
):

    name = data.name.strip()
    store_name = data.store_name.strip()
    email = data.email.strip().lower()

    if len(name) < 2:

        raise HTTPException(
            status_code=400,
            detail="Nama seller minimal 2 karakter.",
        )

    if len(store_name) < 2:

        raise HTTPException(
            status_code=400,
            detail="Nama toko minimal 2 karakter.",
        )

    existing_seller = sellers_collection.find_one(
        {
            "email": email,
        }
    )

    if existing_seller:

        raise HTTPException(
            status_code=409,
            detail="Email seller sudah terdaftar",
        )

    now = datetime.now(timezone.utc)

    seller = {

        "name": name,

        "store_name": store_name,

        "email": email,

        "password": hash_password(
            data.password
        ),

        "profile_image": None,

        "banner_image": None,

        "store_description": "",

        "store_open": True,

        "is_active": True,

        "created_at": now,

        "updated_at": now,
    }

    try:

        result = sellers_collection.insert_one(
            seller
        )

    except DuplicateKeyError:

        raise HTTPException(
            status_code=409,
            detail="Email seller sudah terdaftar",
        )

    seller["_id"] = result.inserted_id

    return {

        "message": "Akun seller berhasil dibuat",

        "seller": serialize_seller(
            seller
        ),
    }


# =========================================================
# SELLER LOGIN
# =========================================================

@app.post("/api/sellers/login")
def login_seller(
    data: SellerLogin,
):

    email = data.email.strip().lower()

    seller = sellers_collection.find_one(
        {
            "email": email,
        }
    )

    if not seller:

        raise HTTPException(
            status_code=401,
            detail="Email atau password salah",
        )

    if seller.get(
        "is_active",
        True,
    ) is False:

        raise HTTPException(
            status_code=403,
            detail="Akun seller sedang dinonaktifkan oleh administrator.",
        )

    if not verify_password(
        data.password,
        seller.get("password", ""),
    ):

        raise HTTPException(
            status_code=401,
            detail="Email atau password salah",
        )

    token = create_access_token(
        str(seller["_id"])
    )

    return {

        "message": "Login berhasil",

        "access_token": token,

        "token_type": "bearer",

        "seller": serialize_seller(
            seller
        ),
    }


# =========================================================
# SELLER ME
# =========================================================

@app.get("/api/sellers/me")
def get_my_seller(
    seller=Depends(get_current_seller),
):

    return {
        "seller": serialize_seller(
            seller
        )
    }


# =========================================================
# SELLER PROFILE
# =========================================================

@app.put("/api/sellers/profile")
def update_seller_profile(
    data: SellerProfileUpdate,
    seller=Depends(get_current_seller),
):

    trimmed_name = data.name.strip()
    trimmed_store_name = data.store_name.strip()
    trimmed_email = data.email.strip().lower()
    trimmed_description = (
        data.store_description.strip()
    )

    existing_seller = sellers_collection.find_one(
        {
            "email": trimmed_email,
            "_id": {
                "$ne": seller["_id"],
            },
        }
    )

    if existing_seller:

        raise HTTPException(
            status_code=409,
            detail="Email seller sudah digunakan oleh akun lain.",
        )

    update_data = {

        "name": trimmed_name,

        "store_name": trimmed_store_name,

        "email": trimmed_email,

        "store_description": trimmed_description,

        "store_open": data.store_open,

        "profile_image": (
            data.profile_image.strip()
            if data.profile_image
            else None
        ),

        "banner_image": (
            data.banner_image.strip()
            if data.banner_image
            else None
        ),

        "updated_at": datetime.now(
            timezone.utc
        ),
    }

    result = sellers_collection.update_one(
        {
            "_id": seller["_id"],
        },
        {
            "$set": update_data,
        },
    )

    if result.matched_count == 0:

        raise HTTPException(
            status_code=404,
            detail="Seller tidak ditemukan.",
        )

    updated_seller = sellers_collection.find_one(
        {
            "_id": seller["_id"],
        }
    )

    return {

        "message": "Pengaturan profil berhasil disimpan.",

        "seller": serialize_seller(
            updated_seller
        ),
    }


# =========================================================
# SELLER PASSWORD
# =========================================================

@app.put("/api/sellers/password")
def change_seller_password(
    data: SellerPasswordChange,
    seller=Depends(get_current_seller),
):

    if not verify_password(
        data.current_password,
        seller.get("password", ""),
    ):

        raise HTTPException(
            status_code=400,
            detail="Password lama tidak sesuai.",
        )

    if (
        data.current_password
        == data.new_password
    ):

        raise HTTPException(
            status_code=400,
            detail="Password baru harus berbeda dari password lama.",
        )

    sellers_collection.update_one(
        {
            "_id": seller["_id"],
        },
        {
            "$set": {

                "password": hash_password(
                    data.new_password
                ),

                "updated_at": datetime.now(
                    timezone.utc
                ),
            }
        },
    )

    return {
        "message": "Password berhasil diperbarui.",
    }


# =========================================================
# SELLER DASHBOARD
# =========================================================

@app.get("/api/sellers/dashboard")
def seller_dashboard(
    seller=Depends(get_current_seller),
):

    seller_id = seller["_id"]

    now = datetime.now(timezone.utc)

    start_of_day = datetime(
        now.year,
        now.month,
        now.day,
        tzinfo=timezone.utc,
    )

    today_orders_list = list(
        orders_collection.find(
            {
                **seller_order_filter(
                    seller_id
                ),

                "created_at": {
                    "$gte": start_of_day,
                },
            }
        )
    )

    total_orders = len(
        today_orders_list
    )

    pending_orders = sum(
        1
        for order in today_orders_list
        if order.get("status")
        == "Menunggu"
    )

    ready_orders = sum(
        1
        for order in today_orders_list
        if order.get("status")
        == "Siap diambil"
    )

    today_income = sum(
        order.get("total", 0)
        for order in today_orders_list
        if order.get("status")
        == "Selesai"
    )

    recent_orders = sorted(
        today_orders_list,
        key=lambda order: order.get(
            "created_at",
            datetime.min.replace(
                tzinfo=timezone.utc
            ),
        ),
        reverse=True,
    )[:10]

    return {

        "seller": serialize_seller(
            seller
        ),

        "stats": {

            "today_income": today_income,

            "today_orders": total_orders,

            "pending_orders": pending_orders,

            "ready_orders": ready_orders,
        },

        "recent_orders": [
            serialize_order(order)
            for order in recent_orders
        ],
    }


# =========================================================
# SELLER MENU
# =========================================================

@app.get("/api/sellers/menu")
def get_seller_menu(
    seller=Depends(get_current_seller),
):

    menus = menus_collection.find(
        {
            "seller_id": seller["_id"],
        }
    ).sort(
        "created_at",
        -1,
    )

    return {

        "menus": [
            serialize_menu(menu)
            for menu in menus
        ]
    }


@app.post("/api/sellers/menu")
def create_seller_menu(
    data: MenuCreate,
    seller=Depends(get_current_seller),
):

    now = datetime.now(timezone.utc)

    menu = {

        "seller_id": seller["_id"],

        "name": data.name.strip(),

        "category": data.category.strip(),

        "price": data.price,

        "description": data.description.strip(),

        "emoji": data.emoji,

        "image": data.image,

        "is_available": data.is_available,

        "created_at": now,

        "updated_at": now,
    }

    result = menus_collection.insert_one(
        menu
    )

    menu["_id"] = result.inserted_id

    return {

        "message": "Menu berhasil ditambahkan",

        "menu": serialize_menu(menu),
    }


@app.put("/api/sellers/menu/{menu_id}")
def update_seller_menu(
    menu_id: str,
    data: MenuUpdate,
    seller=Depends(get_current_seller),
):

    if not ObjectId.is_valid(menu_id):

        raise HTTPException(
            status_code=400,
            detail="ID menu tidak valid",
        )

    object_id = ObjectId(menu_id)

    existing_menu = menus_collection.find_one(
        {
            "_id": object_id,
            "seller_id": seller["_id"],
        }
    )

    if not existing_menu:

        raise HTTPException(
            status_code=404,
            detail="Menu tidak ditemukan",
        )

    update_data = data.model_dump(
        exclude_unset=True
    )

    if "name" in update_data:
        update_data["name"] = (
            update_data["name"].strip()
        )

    if "category" in update_data:
        update_data["category"] = (
            update_data["category"].strip()
        )

    if "description" in update_data:
        update_data["description"] = (
            update_data["description"].strip()
        )

    update_data["updated_at"] = (
        datetime.now(timezone.utc)
    )

    menus_collection.update_one(
        {
            "_id": object_id,
            "seller_id": seller["_id"],
        },
        {
            "$set": update_data,
        },
    )

    updated_menu = menus_collection.find_one(
        {
            "_id": object_id,
            "seller_id": seller["_id"],
        }
    )

    return {

        "message": "Menu berhasil diperbarui",

        "menu": serialize_menu(
            updated_menu
        ),
    }


@app.delete("/api/sellers/menu/{menu_id}")
def delete_seller_menu(
    menu_id: str,
    seller=Depends(get_current_seller),
):

    if not ObjectId.is_valid(menu_id):

        raise HTTPException(
            status_code=400,
            detail="ID menu tidak valid",
        )

    result = menus_collection.delete_one(
        {
            "_id": ObjectId(menu_id),
            "seller_id": seller["_id"],
        }
    )

    if result.deleted_count == 0:

        raise HTTPException(
            status_code=404,
            detail="Menu tidak ditemukan",
        )

    return {
        "message": "Menu berhasil dihapus"
    }


# =========================================================
# SELLER ORDERS
# =========================================================

@app.get("/api/sellers/orders")
def get_seller_orders(
    seller=Depends(get_current_seller),
):

    orders = orders_collection.find(
        seller_order_filter(
            seller["_id"]
        )
    ).sort(
        "created_at",
        -1,
    )

    return {

        "orders": [
            serialize_order(order)
            for order in orders
        ]
    }


@app.put("/api/sellers/orders/{order_id}/status")
def update_order_status(
    order_id: str,
    data: OrderStatusUpdate,
    seller=Depends(get_current_seller),
):

    new_status = data.status.strip()

    if new_status not in ALLOWED_ORDER_STATUSES:

        raise HTTPException(
            status_code=400,
            detail="Status pesanan tidak valid.",
        )

    if not ObjectId.is_valid(order_id):

        raise HTTPException(
            status_code=400,
            detail="ID order tidak valid",
        )

    order_query = {

        "_id": ObjectId(order_id),

        **seller_order_filter(
            seller["_id"]
        ),
    }

    order = orders_collection.find_one(
        order_query
    )

    if not order:

        raise HTTPException(
            status_code=404,
            detail="Pesanan tidak ditemukan",
        )

    old_status = order.get(
        "status",
        "Menunggu",
    )

    now = datetime.now(timezone.utc)

    update_data = {

        "status": new_status,

        "updated_at": now,
    }

    if new_status != old_status:

        update_data[
            "last_status_change"
        ] = now

    orders_collection.update_one(
        order_query,
        {
            "$set": update_data,
        },
    )

    updated_order = orders_collection.find_one(
        {
            "_id": ObjectId(order_id),
        }
    )

    return {

        "message": "Status pesanan berhasil diperbarui",

        "previous_status": old_status,

        "order": serialize_order(
            updated_order
        ),
    }


# =========================================================
# PUBLIC ORDER
# =========================================================

@app.post("/api/public/orders")
def create_public_order(
    data: OrderCreate,
):

    seller = get_seller_by_id(
        data.seller_id,
        require_active=True,
    )

    if seller.get(
        "store_open",
        True,
    ) is False:

        raise HTTPException(
            status_code=400,
            detail="Toko sedang tutup.",
        )

    order_items = []

    total = 0

    for requested_item in data.items:

        if not ObjectId.is_valid(
            requested_item.menu_id
        ):

            raise HTTPException(
                status_code=400,
                detail="ID menu tidak valid",
            )

        menu = menus_collection.find_one(
            {
                "_id": ObjectId(
                    requested_item.menu_id
                ),

                "seller_id": seller["_id"],

                "is_available": True,
            }
        )

        if not menu:

            raise HTTPException(
                status_code=400,
                detail="Menu tidak tersedia.",
            )

        quantity = requested_item.quantity

        price = menu.get(
            "price",
            0,
        )

        subtotal = price * quantity

        total += subtotal

        order_items.append(
            {

                "menu_id": str(
                    menu["_id"]
                ),

                "name": menu.get(
                    "name",
                    "",
                ),

                "price": price,

                "quantity": quantity,

                "subtotal": subtotal,

                "image": menu.get(
                    "image"
                ),

                "emoji": menu.get(
                    "emoji",
                    "🍽️",
                ),
            }
        )

    now = datetime.now(timezone.utc)

    order = {

        "code": generate_order_code(),

        "seller_id": seller["_id"],

        "seller_name": seller.get(
            "store_name",
            "Kantin",
        ),

        "customer_name": (
            data.customer_name.strip()
        ),

        "customer_class": (
            data.customer_class.strip()
        ),

        "items": order_items,

        "total": total,

        "status": "Menunggu",

        "created_at": now,

        "updated_at": now,

        "last_status_change": None,
    }

    result = orders_collection.insert_one(
        order
    )

    order["_id"] = result.inserted_id

    return {

        "message": "Pesanan berhasil dibuat",

        "order": serialize_order(
            order
        ),
    }


@app.get("/api/public/orders/{order_identifier}")
def get_public_order(
    order_identifier: str,
):

    identifier = order_identifier.strip()

    order = None

    if ObjectId.is_valid(identifier):

        order = orders_collection.find_one(
            {
                "_id": ObjectId(
                    identifier
                )
            }
        )

    if not order:

        order = orders_collection.find_one(
            {
                "code": identifier.upper()
            }
        )

    if not order:

        raise HTTPException(
            status_code=404,
            detail="Pesanan tidak ditemukan",
        )

    return {
        "order": serialize_order(order)
    }


# =========================================================
# DEBUG
# =========================================================

@app.get("/debug/database")
def debug_database():

    return {
        "database": DATABASE_NAME
    }


@app.get("/debug/database-host")
def debug_database_host():

    try:

        from urllib.parse import urlparse

        parsed = urlparse(
            MONGODB_URI
        )

        return {

            "database": DATABASE_NAME,

            "host": parsed.hostname,
        }

    except Exception as error:

        return {

            "database": DATABASE_NAME,

            "host": None,

            "error": str(error),
        }