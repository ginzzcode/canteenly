
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/StorePage.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function StorePage() {
  const navigate = useNavigate();
  const { storeId } = useParams();

  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");

  useEffect(() => {
    loadStore();
  }, [storeId]);

  async function loadStore() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/public/stores`);

      if (!response.ok) {
        throw new Error("Gagal mengambil data kantin.");
      }

      const data = await response.json();

      const stores = data.stores || [];

      const foundStore = stores.find(
        (item) => String(item.id) === String(storeId)
      );

      if (!foundStore) {
        throw new Error("Kantin tidak ditemukan.");
      }

      setStore(foundStore);
    } catch (err) {
      console.error("StorePage error:", err);

      setError(
        err.message || "Data kantin tidak dapat dimuat."
      );
    } finally {
      setLoading(false);
    }
  }

  const categories = useMemo(() => {
    if (!store) {
      return ["Semua"];
    }

    const result = new Set();

    (store.menus || []).forEach((menu) => {
      if (menu.category) {
        result.add(menu.category);
      }
    });

    return ["Semua", ...Array.from(result)];
  }, [store]);

  const filteredMenus = useMemo(() => {
    if (!store) {
      return [];
    }

    const keyword = search.trim().toLowerCase();

    return (store.menus || []).filter((menu) => {
      const matchCategory =
        activeCategory === "Semua" ||
        menu.category === activeCategory;

      const matchSearch =
        !keyword ||
        menu.name?.toLowerCase().includes(keyword) ||
        menu.description?.toLowerCase().includes(keyword);

      return matchCategory && matchSearch;
    });
  }, [store, search, activeCategory]);

  const cartItemCount = useMemo(() => {
    return cart.reduce(
      (total, item) => total + item.quantity,
      0
    );
  }, [cart]);

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + Number(item.price || 0) * item.quantity,
      0
    );
  }, [cart]);

  function addToCart(menu) {
    if (menu.is_available === false) {
      return;
    }

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => String(item.id) === String(menu.id)
      );

      if (existingItem) {
        return currentCart.map((item) =>
          String(item.id) === String(menu.id)
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          id: menu.id,
          name: menu.name,
          price: Number(menu.price || 0),
          quantity: 1,
          image: menu.image || "",
        },
      ];
    });
  }

  function decreaseCartItem(menuId) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          String(item.id) === String(menuId)
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function increaseCartItem(menuId) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        String(item.id) === String(menuId)
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  }

  function getCartQuantity(menuId) {
    const item = cart.find(
      (cartItem) =>
        String(cartItem.id) === String(menuId)
    );

    return item?.quantity || 0;
  }

  function formatPrice(price) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(price || 0));
  }

  function getStoreInitial() {
    return (
      store?.store_name
        ?.charAt(0)
        ?.toUpperCase() || "K"
    );
  }

  function handleBack() {
    navigate("/buyer");
  }

  function scrollToCart() {
    document
      .getElementById("store-cart")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  function handleCheckout() {
    if (cart.length === 0) {
      return;
    }

    navigate("/buyer/checkout", {
      state: {
        store,
        cart,
        total: cartTotal,
      },
    });
  }

  if (loading) {
    return (
      <div className="store-page">
        <div className="store-state-card">
          <div className="store-loading-spinner" />

          <h3>Menyiapkan kantin...</h3>

          <p>
            Sedang mengambil daftar menu.
          </p>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="store-page">
        <div className="store-state-card store-error-state">
          <div className="store-state-icon">!</div>

          <h3>Kantin tidak ditemukan</h3>

          <p>
            {error ||
              "Kantin yang kamu pilih tidak tersedia."}
          </p>

          <button
            type="button"
            onClick={handleBack}
            className="store-retry-button"
          >
            ← Kembali ke dashboard
          </button>
        </div>
      </div>
    );
  }

  const availableMenus = (store.menus || []).filter(
    (menu) => menu.is_available !== false
  );

  return (
    <div className="store-page">
      {/* HEADER */}
      <header className="store-header">
        <div className="store-header-left">
          <button
            type="button"
            className="store-back-button"
            onClick={handleBack}
            aria-label="Kembali"
          >
            ←
          </button>

          <button
            type="button"
            className="store-brand"
            onClick={() => navigate("/buyer")}
            aria-label="Kembali ke Canteenly"
          >
            <div className="store-brand-logo">
              <span>C</span>
            </div>

            <div className="store-brand-text">
              <strong>Canteenly</strong>

              <span>Smart Canteen</span>
            </div>
          </button>
        </div>

        <button
          type="button"
          className="store-cart-button"
          onClick={scrollToCart}
        >
          <span className="store-cart-icon">🛒</span>

          <span className="store-cart-label">
            Keranjang
          </span>

          {cartItemCount > 0 && (
            <span className="store-cart-count">
              {cartItemCount}
            </span>
          )}
        </button>
      </header>

      <main className="store-content">
        {/* HERO */}
        <section className="store-hero">
          <div className="store-hero-content">
            <div className="store-hero-label">
              KANTIN AKTIF
            </div>

            <div className="store-hero-store">
              <div className="store-hero-store-logo">
                {store.profile_image ? (
                  <img
                    src={store.profile_image}
                    alt={
                      store.store_name ||
                      "Logo kantin"
                    }
                  />
                ) : (
                  <span>{getStoreInitial()}</span>
                )}
              </div>

              <div className="store-hero-store-info">
                <h1>
                  {store.store_name || "Kantin"}
                </h1>

                <p>
                  {store.name
                    ? `Dikelola oleh ${store.name}`
                    : "Temukan berbagai menu makanan dan minuman."}
                </p>
              </div>
            </div>

            <div className="store-hero-meta">
              <span className="store-hero-meta-item">
                <i>●</i>
                Buka
              </span>

              <span className="store-hero-meta-item">
                <strong>
                  {availableMenus.length}
                </strong>
                menu tersedia
              </span>
            </div>
          </div>

          <div className="store-hero-visual">
            <div className="store-hero-circle store-hero-circle-one" />
            <div className="store-hero-circle store-hero-circle-two" />

            <div className="store-hero-food">
              🍽️
            </div>
          </div>
        </section>

        {/* SEARCH */}
        <section className="store-search-section">
          <div className="store-search-wrapper">
            <span className="store-search-icon">
              ⌕
            </span>

            <input
              type="text"
              placeholder="Cari makanan atau minuman..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            {search && (
              <button
                type="button"
                className="store-search-clear"
                onClick={() => setSearch("")}
              >
                ×
              </button>
            )}
          </div>
        </section>

        {/* CATEGORY */}
        {categories.length > 1 && (
          <section className="store-category-section">
            <div className="store-category-list">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  className={`store-category-button ${
                    activeCategory === category
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setActiveCategory(category)
                  }
                >
                  {category}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* MENU */}
        <section className="store-menu-section">
          <div className="store-menu-heading">
            <div>
              <div className="store-menu-label">
                MENU
              </div>

              <h2>Pilihan makanan</h2>
            </div>

            <div className="store-menu-count">
              <strong>
                {filteredMenus.length}
              </strong>{" "}
              menu
            </div>
          </div>

          {filteredMenus.length === 0 ? (
            <div className="store-state-card">
              <div className="store-state-icon">
                ⌕
              </div>

              <h3>Menu tidak ditemukan</h3>

              <p>
                Tidak ada menu yang sesuai dengan
                pencarian atau kategori yang dipilih.
              </p>

              {(search ||
                activeCategory !== "Semua") && (
                <button
                  type="button"
                  className="store-retry-button"
                  onClick={() => {
                    setSearch("");
                    setActiveCategory("Semua");
                  }}
                >
                  Reset filter
                </button>
              )}
            </div>
          ) : (
            <div className="store-menu-grid">
              {filteredMenus.map((menu) => {
                const quantity = getCartQuantity(
                  menu.id
                );

                const isAvailable =
                  menu.is_available !== false;

                return (
                  <article
                    className={`store-menu-card ${
                      !isAvailable
                        ? "unavailable"
                        : ""
                    }`}
                    key={menu.id}
                  >
                    <div className="store-menu-image">
                      {menu.image ? (
                        <img
                          src={menu.image}
                          alt={menu.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className="store-menu-image-placeholder">
                          {menu.emoji || "🍜"}
                        </div>
                      )}

                      {menu.category && (
                        <span className="store-menu-category">
                          {menu.category}
                        </span>
                      )}

                      {!isAvailable && (
                        <span className="store-menu-availability unavailable">
                          Tidak tersedia
                        </span>
                      )}
                    </div>

                    <div className="store-menu-content">
                      <div className="store-menu-title">
                        <h3>
                          {menu.name || "Menu"}
                        </h3>

                        <span className="store-menu-price">
                          {formatPrice(menu.price)}
                        </span>
                      </div>

                      <p className="store-menu-description">
                        {menu.description ||
                          "Menu pilihan kantin."}
                      </p>

                      <div className="store-menu-footer">
                        {quantity === 0 ? (
                          <button
                            type="button"
                            className="store-add-cart"
                            disabled={!isAvailable}
                            onClick={() =>
                              addToCart(menu)
                            }
                          >
                            <span className="store-add-cart-icon">
                              +
                            </span>

                            {isAvailable
                              ? "Tambah"
                              : "Habis"}
                          </button>
                        ) : (
                          <div className="store-quantity">
                            <button
                              type="button"
                              onClick={() =>
                                decreaseCartItem(
                                  menu.id
                                )
                              }
                            >
                              −
                            </button>

                            <strong>
                              {quantity}
                            </strong>

                            <button
                              type="button"
                              onClick={() =>
                                increaseCartItem(
                                  menu.id
                                )
                              }
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* CART */}
        <section
          className="store-cart-section"
          id="store-cart"
        >
          <div className="store-menu-heading">
            <div>
              <div className="store-menu-label">
                ORDER
              </div>

              <h2>Keranjang kamu</h2>
            </div>

            {cart.length > 0 && (
              <div className="store-menu-count">
                <strong>{cartItemCount}</strong>{" "}
                item
              </div>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="store-empty-cart">
              <div className="store-empty-cart-icon">
                🛒
              </div>

              <div>
                <strong>
                  Keranjang masih kosong
                </strong>

                <span>
                  Tambahkan menu yang ingin kamu
                  pesan.
                </span>
              </div>
            </div>
          ) : (
            <div className="store-cart-card">
              <div className="store-cart-list">
                {cart.map((item) => (
                  <div
                    className="store-cart-item"
                    key={item.id}
                  >
                    <div className="store-cart-item-info">
                      <strong>{item.name}</strong>

                      <span>
                        {formatPrice(item.price)} ×{" "}
                        {item.quantity}
                      </span>
                    </div>

                    <div className="store-cart-item-right">
                      <strong>
                        {formatPrice(
                          item.price *
                            item.quantity
                        )}
                      </strong>

                      <div className="store-cart-quantity">
                        <button
                          type="button"
                          onClick={() =>
                            decreaseCartItem(
                              item.id
                            )
                          }
                        >
                          −
                        </button>

                        <span>
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            increaseCartItem(
                              item.id
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="store-cart-summary">
                <div className="store-cart-total">
                  <span>Total pesanan</span>

                  <strong>
                    {formatPrice(cartTotal)}
                  </strong>
                </div>

                <button
                  type="button"
                  className="store-checkout-button"
                  onClick={handleCheckout}
                >
                  Lanjut checkout
                  <span>→</span>
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* MOBILE CART BAR */}
      {cart.length > 0 && (
        <div className="store-cart-bar">
          <div className="store-cart-bar-info">
            <strong>
              {cartItemCount} item
            </strong>

            <span>
              {formatPrice(cartTotal)}
            </span>
          </div>

          <button
            type="button"
            className="store-cart-checkout"
            onClick={handleCheckout}
          >
            Checkout
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default StorePage;
