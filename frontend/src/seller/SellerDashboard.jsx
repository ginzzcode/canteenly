import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  LogOut,
  Menu,
  Package,
  RefreshCw,
  Settings,
  ShoppingBag,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";

import "../styles/SellerDashboard.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const SELLER_TOKEN_KEY = "canteenly_seller_token";
const SELLER_DATA_KEY = "canteenly_seller";

function formatRupiah(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
}

function getStatusConfig(status) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();

  if (
    normalized === "selesai" ||
    normalized === "completed" ||
    normalized === "done"
  ) {
    return {
      label: "Selesai",
      className: "success",
      icon: CheckCircle2,
    };
  }

  if (
    normalized === "siap diambil" ||
    normalized === "ready" ||
    normalized === "ready_to_pickup"
  ) {
    return {
      label: "Siap diambil",
      className: "ready",
      icon: Package,
    };
  }

  if (
    normalized === "dibatalkan" ||
    normalized === "cancelled" ||
    normalized === "canceled"
  ) {
    return {
      label: "Dibatalkan",
      className: "danger",
      icon: XCircle,
    };
  }

  return {
    label: status || "Menunggu",
    className: "pending",
    icon: Clock3,
  };
}

function StatIcon({ type }) {
  if (type === "income") {
    return <Wallet size={22} strokeWidth={2.2} />;
  }

  if (type === "orders") {
    return <ShoppingBag size={22} strokeWidth={2.2} />;
  }

  if (type === "pending") {
    return <Clock3 size={22} strokeWidth={2.2} />;
  }

  return <Package size={22} strokeWidth={2.2} />;
}

export default function SellerDashboard() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const getStoredSeller = () => {
    try {
      const stored = localStorage.getItem(
        SELLER_DATA_KEY
      );

      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const clearSellerSession = () => {
    localStorage.removeItem(SELLER_TOKEN_KEY);
    localStorage.removeItem(SELLER_DATA_KEY);

    navigate("/seller/login", {
      replace: true,
    });
  };

  const loadDashboard = useCallback(
    async (showRefresh = false) => {
      const token = localStorage.getItem(
        SELLER_TOKEN_KEY
      );

      if (!token) {
        clearSellerSession();
        return;
      }

      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await fetch(
          `${API_URL}/api/sellers/dashboard`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        let data = {};

        try {
          data = await response.json();
        } catch {
          data = {};
        }

        if (response.status === 401) {
          clearSellerSession();
          return;
        }

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Gagal memuat dashboard."
          );
        }

        setDashboard(data);

        if (data.seller) {
          localStorage.setItem(
            SELLER_DATA_KEY,
            JSON.stringify(data.seller)
          );
        }
      } catch (err) {
        console.error(
          "Seller dashboard error:",
          err
        );

        setError(
          err.message ||
            "Gagal memuat dashboard."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleLogout = () => {
    localStorage.removeItem(
      SELLER_TOKEN_KEY
    );

    localStorage.removeItem(
      SELLER_DATA_KEY
    );

    navigate("/seller/login", {
      replace: true,
    });
  };

  const handleGoDashboard = () => {
    navigate("/seller/dashboard");
  };

  const handleGoMenu = () => {
    navigate("/seller/menu");
  };

  const handleGoOrders = () => {
    navigate("/seller/orders");
  };

  const handleSettings = () => {
    navigate("/seller/settings");
  };

  const storedSeller = getStoredSeller();

  const seller =
    dashboard?.seller || storedSeller || {};

  const stats = dashboard?.stats || {};

  const recentOrders = Array.isArray(
    dashboard?.recent_orders
  )
    ? dashboard.recent_orders
    : [];

  if (loading) {
    return (
      <div className="seller-page">
        <div className="seller-shell">
          <div className="seller-loading-screen">
            <div className="seller-loading-spinner" />

            <div>
              <strong>
                Memuat dashboard
              </strong>

              <span>
                Menyiapkan data kantin...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-page">
      <div className="seller-shell">
        {/* HEADER */}

        <header className="seller-header">
          <button
            type="button"
            className="seller-brand"
            onClick={handleGoDashboard}
            aria-label="Kembali ke dashboard"
          >
            <div className="seller-brand-icon">
              <ShoppingBag
                size={21}
                strokeWidth={2.5}
              />
            </div>

            <div>
              <strong>Canteenly</strong>

              <span>
                Seller Dashboard
              </span>
            </div>
          </button>

          <div className="seller-header-right">
            <div className="seller-profile">
              <div className="seller-avatar">
                {String(
                  seller.name || "S"
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="seller-profile-info">
                <strong>
                  {seller.name || "Seller"}
                </strong>

                <span>
                  {seller.store_name ||
                    "Kantin"}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="seller-logout"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        <main className="seller-main">
          {/* HERO */}

          <section className="seller-hero">
            <div className="seller-hero-content">
              <span className="seller-eyebrow">
                DASHBOARD PENJUAL
              </span>

              <h1>
                Halo,{" "}
                {seller.name || "Seller"}
                <span className="wave">
                  👋
                </span>
              </h1>

              <p>
                Kelola pesanan dan menu{" "}
                <strong>
                  {seller.store_name ||
                    "kantinmu"}
                </strong>{" "}
                dari satu tempat.
              </p>
            </div>

            <button
              type="button"
              className="refresh-button"
              onClick={() =>
                loadDashboard(true)
              }
              disabled={refreshing}
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "refresh-spinning"
                    : ""
                }
              />

              <span>
                {refreshing
                  ? "Memuat..."
                  : "Refresh"}
              </span>
            </button>
          </section>

          {/* ERROR */}

          {error && (
            <div className="seller-error">
              <XCircle size={19} />

              <div>
                <strong>
                  Dashboard gagal dimuat
                </strong>

                <span>{error}</span>
              </div>

              <button
                type="button"
                onClick={() =>
                  loadDashboard(true)
                }
              >
                Coba lagi
              </button>
            </div>
          )}

          {/* STATISTICS */}

          <section className="stats-grid">
            <article className="stat-card">
              <div className="stat-icon income">
                <StatIcon type="income" />
              </div>

              <div className="stat-content">
                <span>
                  Pendapatan hari ini
                </span>

                <strong>
                  {formatRupiah(
                    stats.today_income
                  )}
                </strong>

                <small>
                  Total transaksi selesai
                </small>
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-icon orders">
                <StatIcon type="orders" />
              </div>

              <div className="stat-content">
                <span>
                  Pesanan hari ini
                </span>

                <strong>
                  {stats.today_orders || 0}
                </strong>

                <small>
                  Semua pesanan masuk
                </small>
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-icon pending">
                <StatIcon type="pending" />
              </div>

              <div className="stat-content">
                <span>
                  Perlu diproses
                </span>

                <strong>
                  {stats.pending_orders ||
                    0}
                </strong>

                <small>
                  Menunggu tindakan
                </small>
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-icon ready">
                <StatIcon type="ready" />
              </div>

              <div className="stat-content">
                <span>
                  Siap diambil
                </span>

                <strong>
                  {stats.ready_orders || 0}
                </strong>

                <small>
                  Menunggu siswa
                </small>
              </div>
            </article>
          </section>

          {/* MAIN GRID */}

          <div className="seller-content-grid">
            {/* RECENT ORDERS */}

            <section className="seller-card orders-card">
              <div className="seller-card-header">
                <div>
                  <span className="card-eyebrow">
                    PESANAN TERBARU
                  </span>

                  <h2>
                    Pesanan hari ini
                  </h2>

                  <p>
                    Pantau pesanan yang masuk
                    ke kantinmu.
                  </p>
                </div>

                {recentOrders.length > 0 && (
                  <span className="order-count">
                    {recentOrders.length}{" "}
                    pesanan
                  </span>
                )}
              </div>

              {recentOrders.length === 0 ? (
                <div className="empty-orders">
                  <div className="empty-orders-icon">
                    <ShoppingBag
                      size={24}
                    />
                  </div>

                  <strong>
                    Belum ada pesanan hari
                    ini
                  </strong>

                  <span>
                    Pesanan siswa akan
                    muncul di sini setelah
                    dibuat.
                  </span>
                </div>
              ) : (
                <div className="orders-list">
                  {recentOrders.map(
                    (order, index) => {
                      const status =
                        getStatusConfig(
                          order.status
                        );

                      const StatusIcon =
                        status.icon;

                      return (
                        <article
                          className="order-item"
                          key={
                            order.id ||
                            order._id ||
                            order.code ||
                            index
                          }
                        >
                          <div className="order-main">
                            <div className="order-code">
                              {order.code ||
                                "-"}
                            </div>

                            <div className="order-info">
                              <strong>
                                {order.customer ||
                                  "Siswa"}
                              </strong>

                              <span>
                                {order.className ||
                                  "Kelas -"}
                                {" • "}
                                {order.time ||
                                  "-"}
                              </span>
                            </div>
                          </div>

                          <div className="order-right">
                            <strong className="order-total">
                              {formatRupiah(
                                order.total
                              )}
                            </strong>

                            <span
                              className={`order-status ${status.className}`}
                            >
                              <StatusIcon
                                size={14}
                              />

                              {status.label}
                            </span>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              )}

              <button
                type="button"
                className="card-link-button"
                onClick={handleGoOrders}
              >
                Lihat semua pesanan
                <ArrowRight size={17} />
              </button>
            </section>

            {/* QUICK ACTIONS */}

            <aside className="seller-card quick-card">
              <div className="seller-card-header">
                <div>
                  <span className="card-eyebrow">
                    AKSES CEPAT
                  </span>

                  <h2>
                    Kelola kantin
                  </h2>

                  <p>
                    Akses fitur utama dengan
                    cepat.
                  </p>
                </div>
              </div>

              <div className="quick-actions">
                {/* MENU */}

                <button
                  type="button"
                  className="quick-action"
                  onClick={handleGoMenu}
                >
                  <div className="quick-action-icon orange">
                    <Menu size={20} />
                  </div>

                  <div>
                    <strong>
                      Kelola Menu
                    </strong>

                    <span>
                      Tambah, edit, dan atur
                      menu
                    </span>
                  </div>

                  <ChevronRight
                    size={18}
                  />
                </button>

                {/* ORDERS */}

                <button
                  type="button"
                  className="quick-action"
                  onClick={handleGoOrders}
                >
                  <div className="quick-action-icon blue">
                    <Package size={20} />
                  </div>

                  <div>
                    <strong>
                      Pesanan Masuk
                    </strong>

                    <span>
                      Lihat dan proses
                      pesanan
                    </span>
                  </div>

                  <ChevronRight
                    size={18}
                  />
                </button>

                {/* SETTINGS */}

                <button
                  type="button"
                  className="quick-action"
                  onClick={handleSettings}
                >
                  <div className="quick-action-icon purple">
                    <Settings size={20} />
                  </div>

                  <div>
                    <strong>
                      Pengaturan Kantin
                    </strong>

                    <span>
                      Atur informasi kantin
                    </span>
                  </div>

                  <ChevronRight
                    size={18}
                  />
                </button>
              </div>
            </aside>
          </div>

          {/* BOTTOM INFO */}

          <section className="seller-bottom-grid">
            <div className="seller-info-banner">
              <div className="info-banner-icon">
                <TrendingUp size={22} />
              </div>

              <div>
                <strong>
                  Pantau performa kantinmu
                </strong>

                <span>
                  Semua statistik di
                  dashboard diperbarui dari
                  data pesanan terbaru.
                </span>
              </div>
            </div>

            <div className="store-status">
              <span className="status-dot" />

              <div>
                <strong>
                  Kantin aktif
                </strong>

                <span>
                  {seller.store_name ||
                    "Kantin kamu"}{" "}
                  siap menerima pesanan
                </span>
              </div>
            </div>
          </section>
        </main>

        <footer className="seller-footer">
          <span>
            Canteenly Seller Dashboard
          </span>

          <span>•</span>

          <span>
            Kelola kantin lebih mudah.
          </span>
        </footer>
      </div>
    </div>
  );
}