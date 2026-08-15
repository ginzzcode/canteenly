import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/BuyerDashboard.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://canteenly.fastapicloud.dev";
function BuyerDashboard() {
  const navigate = useNavigate();

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");

  useEffect(() => {
    loadStores();
  }, []);

  async function loadStores() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/public/stores`
      );

      if (!response.ok) {
        throw new Error("Gagal mengambil data toko");
      }

      const data = await response.json();

      setStores(
        Array.isArray(data.stores)
          ? data.stores
          : []
      );
    } catch (err) {
      console.error("Buyer stores error:", err);

      setError(
        "Data kantin belum dapat dimuat. Pastikan backend sedang berjalan."
      );
    } finally {
      setLoading(false);
    }
  }

  const categories = useMemo(() => {
    const result = new Set();

    stores.forEach((store) => {
      (store.menus || []).forEach((menu) => {
        if (menu.category) {
          result.add(menu.category);
        }
      });
    });

    return [
      "Semua",
      ...Array.from(result),
    ];
  }, [stores]);

  const filteredStores = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return stores
      .map((store) => {
        const filteredMenus = (store.menus || []).filter(
          (menu) => {
            const matchCategory =
              activeCategory === "Semua" ||
              menu.category === activeCategory;

            const matchSearch =
              !keyword ||
              menu.name
                ?.toLowerCase()
                .includes(keyword) ||
              menu.description
                ?.toLowerCase()
                .includes(keyword) ||
              store.store_name
                ?.toLowerCase()
                .includes(keyword) ||
              store.name
                ?.toLowerCase()
                .includes(keyword);

            return matchCategory && matchSearch;
          }
        );

        return {
          ...store,
          menus: filteredMenus,
        };
      })
      .filter(
        (store) => store.menus.length > 0
      );
  }, [
    stores,
    search,
    activeCategory,
  ]);

  const totalMenus = useMemo(() => {
    return filteredStores.reduce(
      (total, store) =>
        total + (store.menus?.length || 0),
      0
    );
  }, [filteredStores]);

  function openStore(store) {
    navigate(`/buyer/store/${store.id}`);
  }

  function handleOrderClick() {
    navigate("/buyer/orders");
  }

  function getStoreInitial(store) {
    return (
      store.store_name
        ?.charAt(0)
        ?.toUpperCase() || "K"
    );
  }

  return (
    <div className="buyer-dashboard-page">
      <div className="buyer-bg-orb buyer-bg-orb-one" />
      <div className="buyer-bg-orb buyer-bg-orb-two" />
      <div className="buyer-bg-grid" />

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="buyer-dashboard-header">
        <div className="buyer-dashboard-header-inner">
          <button
            type="button"
            className="buyer-brand"
            onClick={() => navigate("/buyer")}
          >
            <div className="buyer-brand-logo">
              <span>C</span>
            </div>

            <div className="buyer-brand-text">
              <strong>Canteenly</strong>

              <span>Smart Canteen</span>
            </div>
          </button>

          <div className="buyer-header-actions">
            <button
              type="button"
              className="buyer-seller-button"
              onClick={() =>
                navigate("/seller/login")
              }
            >
              <span className="buyer-seller-icon">
                ♙
              </span>

              <span>Area Seller</span>
            </button>

            <button
              type="button"
              className="buyer-orders-button"
              onClick={handleOrderClick}
            >
              <span className="buyer-orders-icon">
                ⌑
              </span>

              <span>Pesanan saya</span>
            </button>
          </div>
        </div>
      </header>

      <main className="buyer-dashboard-content">

        {/* =====================================================
            HERO
        ====================================================== */}

        <section className="buyer-dashboard-hero">
          <div className="buyer-hero-content">
            <div className="buyer-hero-badge">
              <span className="buyer-hero-badge-dot" />

              KANTIN SEKOLAH
            </div>

            <h1>
              Mau makan apa
              <br />

              <span>hari ini?</span>
            </h1>

            <p>
              Temukan makanan favoritmu
              dari berbagai kantin yang
              tersedia.
            </p>

            <div className="buyer-hero-stats">
              <div className="buyer-hero-stat">
                <strong>{stores.length}</strong>

                <span>Kantin</span>
              </div>

              <div className="buyer-stat-divider" />

              <div className="buyer-hero-stat">
                <strong>{totalMenus}</strong>

                <span>Menu</span>
              </div>
            </div>
          </div>

          <div className="buyer-hero-visual">
            <div className="buyer-hero-circle buyer-circle-one" />
            <div className="buyer-hero-circle buyer-circle-two" />

            <div className="buyer-food-emoji">
              🍜
            </div>

            <div className="buyer-floating-card buyer-floating-card-top">
              <span>🍱</span>

              <div>
                <strong>Menu favorit</strong>

                <small>Siap dipesan</small>
              </div>
            </div>

            <div className="buyer-floating-card buyer-floating-card-bottom">
              <span>✨</span>

              <div>
                <strong>Fresh today</strong>

                <small>Menu kantin</small>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            SEARCH
        ====================================================== */}

        <section className="buyer-search-section">
          <div className="buyer-search-wrapper">
            <span className="buyer-search-icon">
              ⌕
            </span>

            <input
              type="text"
              placeholder="Cari makanan atau kantin..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            {search && (
              <button
                type="button"
                className="buyer-search-clear"
                onClick={() => setSearch("")}
                aria-label="Hapus pencarian"
              >
                ×
              </button>
            )}

            <div className="buyer-search-shortcut">
              SEARCH
            </div>
          </div>
        </section>

        {/* =====================================================
            CATEGORY
        ====================================================== */}

        <section className="buyer-category-section">
          <div className="buyer-section-heading">
            <div>
              <span className="buyer-section-label">
                EXPLORE
              </span>

              <h2>Kategori menu</h2>
            </div>
          </div>

          <div className="buyer-category-list">
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                className={`buyer-category-button ${
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

        {/* =====================================================
            STORE LIST
        ====================================================== */}

        <section className="buyer-store-section">
          <div className="buyer-section-heading">
            <div>
              <span className="buyer-section-label">
                DISCOVER
              </span>

              <h2>Kantin tersedia</h2>
            </div>

            {!loading && !error && (
              <div className="buyer-result-count">
                <strong>
                  {filteredStores.length}
                </strong>

                <span>kantin</span>
              </div>
            )}
          </div>

          {/* LOADING */}

          {loading && (
            <div className="buyer-state-card">
              <div className="buyer-loading-spinner" />

              <h3>Menyiapkan kantin...</h3>

              <p>
                Tunggu sebentar, kami sedang
                mengambil menu terbaru.
              </p>
            </div>
          )}

          {/* ERROR */}

          {!loading && error && (
            <div className="buyer-state-card buyer-error-card">
              <div className="buyer-state-icon">
                !
              </div>

              <h3>Oops, ada masalah</h3>

              <p>{error}</p>

              <button
                type="button"
                onClick={loadStores}
                className="buyer-retry-button"
              >
                Coba lagi
              </button>
            </div>
          )}

          {/* EMPTY */}

          {!loading &&
            !error &&
            filteredStores.length === 0 && (
              <div className="buyer-state-card buyer-empty-card">
                <div className="buyer-state-icon">
                  ⌕
                </div>

                <h3>Menu tidak ditemukan</h3>

                <p>
                  Tidak ada kantin atau menu yang
                  cocok dengan pencarianmu.
                </p>

                {(search ||
                  activeCategory !== "Semua") && (
                  <button
                    type="button"
                    className="buyer-reset-button"
                    onClick={() => {
                      setSearch("");
                      setActiveCategory("Semua");
                    }}
                  >
                    Reset pencarian
                  </button>
                )}
              </div>
            )}

          {/* STORE GRID */}

          {!loading &&
            !error &&
            filteredStores.length > 0 && (
              <div className="buyer-store-grid">
                {filteredStores.map((store) => (
                  <button
                    type="button"
                    className="buyer-store-card"
                    key={store.id}
                    onClick={() => openStore(store)}
                  >
                    {/* =================================================
                        STORE BANNER
                    ================================================== */}

                    <div className="buyer-store-cover">
                      {store.banner_image ? (
                        <img
                          src={store.banner_image}
                          alt={
                            store.store_name ||
                            "Banner toko"
                          }
                          className="buyer-store-banner-image"
                        />
                      ) : (
                        <div className="buyer-store-pattern" />
                      )}

                      <div className="buyer-store-cover-overlay" />

                      <div className="buyer-store-arrow">
                        ↗
                      </div>
                    </div>

                    {/* =================================================
                        STORE CONTENT
                    ================================================== */}

                    <div className="buyer-store-content">
                      <div className="buyer-store-title">
                        <div className="buyer-store-info">

                          {/* PROFILE */}

                          <div className="buyer-store-profile">
                            {store.profile_image ? (
                              <img
                                src={
                                  store.profile_image
                                }
                                alt={
                                  store.store_name ||
                                  "Profil toko"
                                }
                                className="buyer-store-profile-image"
                              />
                            ) : (
                              <div className="buyer-store-profile-fallback">
                                {getStoreInitial(store)}
                              </div>
                            )}
                          </div>

                          {/* STORE NAME */}

                          <div className="buyer-store-name-wrapper">
                            <h3>
                              {store.store_name ||
                                "Kantin"}
                            </h3>

                            <p>
                              {store.name ||
                                "Penjual"}
                            </p>
                          </div>
                        </div>

                        {/* STATUS */}

                        <span className="buyer-store-status">
                          Aktif
                        </span>
                      </div>

                      {/* FOOTER */}

                      <div className="buyer-store-footer">
                        <div className="buyer-menu-count">
                          <span>☷</span>

                          {store.menus?.length || 0}{" "}
                          menu
                        </div>

                        <span className="buyer-store-open">
                          Lihat menu

                          <span>→</span>
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
        </section>
      </main>
    </div>
  );
}

export default BuyerDashboard;