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


load_dotenv()


# =========================================================
# ENVIRONMENT
# =========================================================

MONGODB_URI = os.getenv("MONGODB_URI")

DATABASE_NAME = os.getenv(
    "DATABASE_NAME",
    "canteenly",
)

JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY"
)

if not MONGODB_URI:
    raise RuntimeError(
        "MONGODB_URI belum diatur di file .env"
    )

if not JWT_SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY belum diatur di file .env"
    )


# =========================================================
# DATABASE
# =========================================================

client = MongoClient(MONGODB_URI)

db = client[DATABASE_NAME]

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


def hash_password(
    password: str,
) -> str:
    return pwd_context.hash(
        password
    )


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    return pwd_context.verify(
        plain_password,
        hashed_password,
    )


def create_access_token(
    seller_id: str,
) -> str:
    expire = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=JWT_EXPIRE_MINUTES
        )
    )

    payload = {
        "sub": seller_id,
        "exp": expire,
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


def get_current_seller(
    credentials: HTTPAuthorizationCredentials = Depends(
        security
    ),
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[
                JWT_ALGORITHM
            ],
        )

        seller_id = payload.get(
            "sub"
        )

        if not seller_id:
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail="Token tidak valid",
            )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail="Token sudah kedaluwarsa",
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail="Token tidak valid",
        )

    try:
        seller = (
            sellers_collection.find_one(
                {
                    "_id": ObjectId(
                        seller_id
                    )
                }
            )
        )

    except Exception:
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail="Seller tidak valid",
        )

    if not seller:
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail="Seller tidak ditemukan",
        )

    return seller


# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(
    title="Canteenly API",
    description="Backend Smart Canteen",
    version="1.3.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# MODELS
# =========================================================

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
# ORDER STATUS
# =========================================================

ALLOWED_ORDER_STATUSES = {
    "Menunggu",
    "Diproses",
    "Siap diambil",
    "Selesai",
    "Dibatalkan",
}


# =========================================================
# HELPERS
# =========================================================

def seller_order_filter(
    seller_id,
):
    """
    Mendukung data lama yang menyimpan seller_id
    sebagai ObjectId maupun string.
    """

    seller_id_string = str(
        seller_id
    )

    return {
        "$or": [
            {
                "seller_id": seller_id
            },
            {
                "seller_id": seller_id_string
            },
        ]
    }


def serialize_seller(
    seller,
):
    return {
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

        "storeName": seller.get(
            "store_name",
            "Kantin",
        ),

        "email": seller.get(
            "email",
            "",
        ),

        "store_description": seller.get(
            "store_description",
            "",
        ),

        "storeDescription": seller.get(
            "store_description",
            "",
        ),

        "store_open": seller.get(
            "store_open",
            True,
        ),

        "storeOpen": seller.get(
            "store_open",
            True,
        ),

        "profile_image": seller.get(
            "profile_image"
        ),

        "profileImage": seller.get(
            "profile_image"
        ),

        "banner_image": seller.get(
            "banner_image"
        ),

        "bannerImage": seller.get(
            "banner_image"
        ),
    }


def build_notification(
    order,
):
    """
    Membuat notifikasi berdasarkan status pesanan.
    """

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

            "title": (
                "Pesanan sedang diproses"
            ),

            "message": (
                f"Pesanan {code} "
                "sedang diproses."
            ),
        },

        "Siap diambil": {
            "type": "ready",

            "title": (
                "Pesanan siap diambil"
            ),

            "message": (
                f"Pesanan {code} "
                "sudah siap diambil."
            ),
        },

        "Selesai": {
            "type": "completed",

            "title": (
                "Pesanan selesai"
            ),

            "message": (
                f"Pesanan {code} "
                "sudah selesai."
            ),
        },

        "Dibatalkan": {
            "type": "cancelled",

            "title": (
                "Pesanan dibatalkan"
            ),

            "message": (
                f"Pesanan {code} "
                "telah dibatalkan."
            ),
        },
    }

    notification = notification_map.get(
        status_value
    )

    if not notification:
        return None

    return {
        **notification,

        "status": status_value,

        "changed_at": (
            order.get(
                "last_status_change"
            ).isoformat()
            if order.get(
                "last_status_change"
            )
            else None
        ),
    }


def serialize_menu(
    menu,
):
    return {
        "id": str(
            menu["_id"]
        ),

        "seller_id": str(
            menu.get("seller_id")
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

        "image": menu.get(
            "image"
        ),

        "is_available": menu.get(
            "is_available",
            True,
        ),

        "created_at": (
            menu["created_at"].isoformat()
            if menu.get("created_at")
            else None
        ),

        "updated_at": (
            menu["updated_at"].isoformat()
            if menu.get("updated_at")
            else None
        ),
    }


def serialize_order(
    order,
):
    created_at = order.get(
        "created_at"
    )

    updated_at = order.get(
        "updated_at"
    )

    status_value = order.get(
        "status",
        "Menunggu",
    )

    last_status_change = order.get(
        "last_status_change"
    )

    return {
        "id": str(
            order["_id"]
        ),

        "code": order.get(
            "code",
            "-",
        ),

        "seller_id": str(
            order.get("seller_id")
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

        "time": (
            created_at.astimezone(
                timezone.utc
            ).strftime("%H:%M")
            if created_at
            else "-"
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

        "last_status_change": (
            last_status_change.isoformat()
            if last_status_change
            else None
        ),

        "notification": build_notification(
            order
        ),
    }


def generate_order_code():
    characters = (
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    )

    while True:
        code = "SC-"

        for _ in range(4):
            code += random.choice(
                characters
            )

        if not orders_collection.find_one(
            {
                "code": code
            }
        ):
            return code


# =========================================================
# BASIC ROUTES
# =========================================================

@app.get("/")
def root():
    return {
        "message": "Canteenly API is running",
        "database": DATABASE_NAME,
    }


@app.get("/health")
def health():
    try:
        client.admin.command(
            "ping"
        )

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

    if not menus:
        return {
            "stores": []
        }

    seller_ids = list(
        {
            menu["seller_id"]
            for menu in menus
            if menu.get("seller_id")
            and isinstance(
                menu.get("seller_id"),
                ObjectId,
            )
        }
    )

    sellers = sellers_collection.find(
        {
            "_id": {
                "$in": seller_ids
            }
        }
    )

    seller_map = {
        seller["_id"]: seller
        for seller in sellers
    }

    stores = {}

    for menu in menus:
        seller_id = menu.get(
            "seller_id"
        )

        seller = seller_map.get(
            seller_id
        )

        if not seller:
            continue

        seller_id_string = str(
            seller_id
        )

        if seller_id_string not in stores:
            stores[
                seller_id_string
            ] = {
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
        {},
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
        "stores": stores,
    }


# =========================================================
# PUBLIC SINGLE STORE
# =========================================================

@app.get(
    "/api/public/stores/{seller_id}"
)
def get_public_store(
    seller_id: str,
):
    try:
        seller_object_id = ObjectId(
            seller_id
        )

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="ID seller tidak valid",
        )

    seller = sellers_collection.find_one(
        {
            "_id": seller_object_id,
        },
        {
            "password": 0,
        },
    )

    if not seller:
        raise HTTPException(
            status_code=404,
            detail="Toko tidak ditemukan",
        )

    menus = menus_collection.find(
        {
            "seller_id": seller_object_id,
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

            "menus": serialized_menus,
        }
    }


# =========================================================
# CREATE PUBLIC ORDER
# =========================================================

@app.post(
    "/api/public/orders"
)
def create_public_order(
    data: OrderCreate,
):
    try:
        seller_object_id = ObjectId(
            data.seller_id
        )

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="ID seller tidak valid",
        )

    seller = sellers_collection.find_one(
        {
            "_id": seller_object_id,
        }
    )

    if not seller:
        raise HTTPException(
            status_code=404,
            detail="Toko tidak ditemukan",
        )

    order_items = []

    total = 0

    for requested_item in data.items:
        try:
            menu_object_id = ObjectId(
                requested_item.menu_id
            )

        except Exception:
            raise HTTPException(
                status_code=400,
                detail="ID menu tidak valid",
            )

        menu = menus_collection.find_one(
            {
                "_id": menu_object_id,

                "seller_id": seller_object_id,

                "is_available": True,
            }
        )

        if not menu:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Menu dengan ID "
                    f"{requested_item.menu_id} "
                    "tidak tersedia."
                ),
            )

        quantity = (
            requested_item.quantity
        )

        price = menu.get(
            "price",
            0,
        )

        subtotal = (
            price * quantity
        )

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

    now = datetime.now(
        timezone.utc
    )

    order_code = (
        generate_order_code()
    )

    order = {
        "code": order_code,

        "seller_id": seller_object_id,

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
        "message": (
            "Pesanan berhasil dibuat"
        ),

        "order": serialize_order(
            order
        ),
    }


# =========================================================
# PUBLIC GET ORDER
# =========================================================

@app.get(
    "/api/public/orders/{order_identifier}"
)
def get_public_order(
    order_identifier: str,
):
    identifier = (
        order_identifier.strip()
    )

    if not identifier:
        raise HTTPException(
            status_code=400,
            detail=(
                "ID atau kode pesanan "
                "tidak boleh kosong"
            ),
        )

    order = None

    if ObjectId.is_valid(
        identifier
    ):
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
        "order": serialize_order(
            order
        )
    }


# =========================================================
# SELLER REGISTER
# =========================================================

@app.post(
    "/api/sellers/register"
)
def register_seller(
    data: SellerRegister,
):
    email = (
        data.email.strip().lower()
    )

    existing_seller = (
        sellers_collection.find_one(
            {
                "email": email
            }
        )
    )

    if existing_seller:
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=(
                "Email seller sudah terdaftar"
            ),
        )

    hashed_password = hash_password(
        data.password
    )

    seller = {
        "name": data.name.strip(),

        "store_name": (
            data.store_name.strip()
        ),

        "email": email,

        "password": hashed_password,

        "profile_image": None,

"banner_image": None,

"store_description": "",

"store_open": True,

"created_at": datetime.now(
    timezone.utc
),
    }

    try:
        result = (
            sellers_collection.insert_one(
                seller
            )
        )

    except DuplicateKeyError:
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=(
                "Email seller sudah terdaftar"
            ),
        )

    return {
        "message": (
            "Akun seller berhasil dibuat"
        ),

        "seller": {
            "id": str(
                result.inserted_id
            ),

            "name": seller["name"],

            "store_name": seller[
                "store_name"
            ],

            "email": seller["email"],

            "profile_image": seller[
                "profile_image"
            ],

            "banner_image": seller[
                "banner_image"
            ],
        },
    }


# =========================================================
# SELLER LOGIN
# =========================================================

@app.post(
    "/api/sellers/login"
)
def login_seller(
    data: SellerLogin,
):
    email = (
        data.email.strip().lower()
    )

    seller = sellers_collection.find_one(
        {
            "email": email
        }
    )

    if not seller:
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Email atau password salah"
            ),
        )

    password_valid = (
        verify_password(
            data.password,
            seller["password"],
        )
    )

    if not password_valid:
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Email atau password salah"
            ),
        )

    seller_id = str(
        seller["_id"]
    )

    token = create_access_token(
        seller_id
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

@app.get(
    "/api/sellers/me"
)
def get_my_seller(
    seller=Depends(
        get_current_seller
    ),
):
    return {
        "seller": serialize_seller(
            seller
        )
    }


# =========================================================
# SELLER UPDATE PROFILE / STORE IMAGE
# =========================================================

@app.put(
    "/api/sellers/profile"
)
def update_seller_profile(
    data: SellerProfileUpdate,
    seller=Depends(
        get_current_seller
    ),
):
    trimmed_name = data.name.strip()
    trimmed_store_name = data.store_name.strip()
    trimmed_email = data.email.strip().lower()
    trimmed_description = data.store_description.strip()

    if len(trimmed_name) < 2:
        raise HTTPException(
            status_code=400,
            detail="Nama seller minimal 2 karakter.",
        )

    if len(trimmed_store_name) < 2:
        raise HTTPException(
            status_code=400,
            detail="Nama kantin minimal 2 karakter.",
        )

    if not trimmed_email:
        raise HTTPException(
            status_code=400,
            detail="Email wajib diisi.",
        )

    # Cek apakah email sudah dipakai seller lain
    existing_seller = sellers_collection.find_one(
        {
            "email": trimmed_email,
            "_id": {
                "$ne": seller["_id"]
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

    try:
        result = sellers_collection.update_one(
            {
                "_id": seller["_id"],
            },
            {
                "$set": update_data,
            },
        )

    except Exception as error:
        print(
            "Gagal update seller profile:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail="Gagal menyimpan pengaturan profil.",
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
        "message": (
            "Pengaturan profil berhasil disimpan."
        ),

        "seller": serialize_seller(
            updated_seller
        ),
    }


# =========================================================
# SELLER CHANGE PASSWORD
# =========================================================

@app.put(
    "/api/sellers/password"
)
def change_seller_password(
    data: SellerPasswordChange,
    seller=Depends(
        get_current_seller
    ),
):
    if not verify_password(
        data.current_password,
        seller["password"],
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "Password lama tidak sesuai."
            ),
        )

    if (
        data.current_password
        == data.new_password
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "Password baru harus "
                "berbeda dari password lama."
            ),
        )

    new_hashed_password = hash_password(
        data.new_password
    )

    result = sellers_collection.update_one(
        {
            "_id": seller["_id"],
        },
        {
            "$set": {
                "password": (
                    new_hashed_password
                ),

                "updated_at": (
                    datetime.now(
                        timezone.utc
                    )
                ),
            }
        },
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Password gagal diperbarui."
            ),
        )

    return {
        "message": (
            "Password berhasil diperbarui."
        ),
    }


# =========================================================
# SELLER DASHBOARD
# =========================================================

@app.get(
    "/api/sellers/dashboard"
)
def seller_dashboard(
    seller=Depends(
        get_current_seller
    ),
):
    seller_id = seller["_id"]

    now = datetime.now(
        timezone.utc
    )

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
                    "$gte": start_of_day
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
        order.get(
            "total",
            0,
        )
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

@app.get(
    "/api/sellers/menu"
)
def get_seller_menu(
    seller=Depends(
        get_current_seller
    ),
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


@app.post(
    "/api/sellers/menu"
)
def create_seller_menu(
    data: MenuCreate,
    seller=Depends(
        get_current_seller
    ),
):
    now = datetime.now(
        timezone.utc
    )

    menu = {
        "seller_id": seller["_id"],

        "name": data.name.strip(),

        "category": (
            data.category.strip()
        ),

        "price": data.price,

        "description": (
            data.description.strip()
        ),

        "emoji": data.emoji,

        "image": data.image,

        "is_available": (
            data.is_available
        ),

        "created_at": now,

        "updated_at": now,
    }

    result = menus_collection.insert_one(
        menu
    )

    menu["_id"] = result.inserted_id

    return {
        "message": (
            "Menu berhasil ditambahkan"
        ),

        "menu": serialize_menu(
            menu
        ),
    }


@app.put(
    "/api/sellers/menu/{menu_id}"
)
def update_seller_menu(
    menu_id: str,
    data: MenuUpdate,
    seller=Depends(
        get_current_seller
    ),
):
    try:
        object_id = ObjectId(
            menu_id
        )

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="ID menu tidak valid",
        )

    existing_menu = (
        menus_collection.find_one(
            {
                "_id": object_id,

                "seller_id": seller["_id"],
            }
        )
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
            update_data[
                "category"
            ].strip()
        )

    if "description" in update_data:
        update_data["description"] = (
            update_data[
                "description"
            ].strip()
        )

    update_data[
        "updated_at"
    ] = datetime.now(
        timezone.utc
    )

    menus_collection.update_one(
        {
            "_id": object_id,

            "seller_id": seller["_id"],
        },
        {
            "$set": update_data
        },
    )

    updated_menu = (
        menus_collection.find_one(
            {
                "_id": object_id,

                "seller_id": seller["_id"],
            }
        )
    )

    return {
        "message": (
            "Menu berhasil diperbarui"
        ),

        "menu": serialize_menu(
            updated_menu
        ),
    }


@app.delete(
    "/api/sellers/menu/{menu_id}"
)
def delete_seller_menu(
    menu_id: str,
    seller=Depends(
        get_current_seller
    ),
):
    try:
        object_id = ObjectId(
            menu_id
        )

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="ID menu tidak valid",
        )

    result = menus_collection.delete_one(
        {
            "_id": object_id,

            "seller_id": seller["_id"],
        }
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Menu tidak ditemukan",
        )

    return {
        "message": (
            "Menu berhasil dihapus"
        )
    }


# =========================================================
# SELLER ORDERS
# =========================================================

@app.get(
    "/api/sellers/orders"
)
def get_seller_orders(
    seller=Depends(
        get_current_seller
    ),
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


# =========================================================
# UPDATE SELLER ORDER STATUS
# =========================================================

@app.put(
    "/api/sellers/orders/{order_id}/status"
)
def update_order_status(
    order_id: str,
    data: OrderStatusUpdate,
    seller=Depends(
        get_current_seller
    ),
):
    new_status = (
        data.status.strip()
    )

    if (
        new_status
        not in ALLOWED_ORDER_STATUSES
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Status tidak valid. "
                "Gunakan: Menunggu, Diproses, "
                "Siap diambil, Selesai, "
                "atau Dibatalkan."
            ),
        )

    try:
        order_object_id = ObjectId(
            order_id
        )

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="ID order tidak valid",
        )

    seller_filter = (
        seller_order_filter(
            seller["_id"]
        )
    )

    order_query = {
        "_id": order_object_id,

        **seller_filter,
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

    now = datetime.now(
        timezone.utc
    )

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
            "$set": update_data
        },
    )

    updated_order = (
        orders_collection.find_one(
            {
                "_id": order_object_id
            }
        )
    )

    if not updated_order:
        raise HTTPException(
            status_code=404,
            detail=(
                "Pesanan tidak ditemukan "
                "setelah diperbarui"
            ),
        )

    return {
        "message": (
            "Status pesanan berhasil diperbarui"
        ),

        "previous_status": old_status,

        "order": serialize_order(
            updated_order
        ),
    }


# =========================================================
# PUBLIC GET ORDER BY CODE
# =========================================================

@app.get(
    "/api/public/orders/code/{order_code}"
)
def get_public_order_by_code(
    order_code: str,
):
    """
    Mengambil pesanan berdasarkan kode order.
    Contoh: SC-AB12
    Tidak membutuhkan login.
    """

    code = (
        order_code.strip().upper()
    )

    if not code:
        raise HTTPException(
            status_code=400,
            detail=(
                "Kode pesanan tidak boleh kosong"
            ),
        )

    order = orders_collection.find_one(
        {
            "code": code,
        }
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Pesanan tidak ditemukan",
        )

    return {
        "order": serialize_order(
            order
        ),
    }


# =========================================================
# PUBLIC GET ORDER BY ID
# =========================================================

@app.get(
    "/api/public/orders/id/{order_id}"
)
def get_public_order_by_id(
    order_id: str,
):
    """
    Mengambil pesanan berdasarkan MongoDB ObjectId.
    Tidak membutuhkan login.
    """

    try:
        order_object_id = ObjectId(
            order_id
        )

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="ID order tidak valid",
        )

    order = orders_collection.find_one(
        {
            "_id": order_object_id,
        }
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Pesanan tidak ditemukan",
        )

    return {
        "order": serialize_order(
            order
        ),
    }