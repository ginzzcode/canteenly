
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Admin.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://canteenly.fastapicloud.dev";

const TOKEN_KEY = "canteenly_admin_token";
const ADMIN_KEY = "canteenly_admin";

function Admin() {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [sellers, setSellers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [sellersLoading, setSellersLoading] = useState(true);

  const [error, setError] = useState("");

  // =========================================================
  // LOAD ADMIN DASHBOARD
  // =========================================================

  const loadDashboard = useCallback(async (token) => {
    try {
      setDashboardLoading(true);

      const response = await fetch(
        `${API_URL}/api/admin/dashboard`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        throw new Error("SESSION_EXPIRED");
      }

      if (!response.ok) {
        throw new Error(
          "Gagal mengambil data dashboard admin."
        );
      }

      const data = await response.json();

      setDashboard(data);
    } catch (error) {
      console.error(
        "Gagal mengambil dashboard admin:",
        error
      );

      if (error.message === "SESSION_EXPIRED") {
        handleLogout();
        return;
      }

      setError(
        "Data dashboard tidak dapat dimuat."
      );
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  // =========================================================
  // LOAD SELLERS
  // =========================================================

  const loadSellers = useCallback(async (token) => {
    try {
      setSellersLoading(true);

      const response = await fetch(
        `${API_URL}/api/admin/sellers`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        throw new Error("SESSION_EXPIRED");
      }

      if (!response.ok) {
        throw new Error(
          "Gagal mengambil daftar seller."
        );
      }

      const data = await response.json();

      setSellers(
        Array.isArray(data.sellers)
          ? data.sellers
          : []
      );
    } catch (error) {
      console.error(
        "Gagal mengambil seller:",
        error
      );

      if (error.message === "SESSION_EXPIRED") {
        handleLogout();
        return;
      }

      setError(
        "Daftar seller tidak dapat dimuat."
      );
    } finally {
      setSellersLoading(false);
    }
  }, []);

  // =========================================================
  // CHECK ADMIN SESSION
  // =========================================================

  useEffect(() => {
    checkAdminSession();
  }, []);

  async function checkAdminSession() {
    const token = localStorage.getItem(TOKEN_KEY);
    const savedAdmin = localStorage.getItem(ADMIN_KEY);

    if (!token) {
      setLoading(false);

      navigate("/seller/login", {
        replace: true,
      });

      return;
    }

    if (savedAdmin) {
      try {
        setAdmin(JSON.parse(savedAdmin));
      } catch {
        localStorage.removeItem(ADMIN_KEY);
      }
    }

    try {
      const response = await fetch(
        `${API_URL}/api/admin/me`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ADMIN_KEY);

        setAdmin(null);
        setLoading(false);

        navigate("/seller/login", {
          replace: true,
        });

        return;
      }

      const data = await response.json();

      if (data.admin) {
        setAdmin(data.admin);

        localStorage.setItem(
          ADMIN_KEY,
          JSON.stringify(data.admin)
        );
      }

      // Ambil data dashboard + seller
      await Promise.all([
        loadDashboard(token),
        loadSellers(token),
      ]);
    } catch (error) {
      console.error(
        "Gagal mengecek session admin:",
        error
      );

      if (!savedAdmin) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ADMIN_KEY);

        navigate("/seller/login", {
          replace: true,
        });

        return;
      }

      // Kalau session masih punya data lokal,
      // dashboard tetap boleh tampil.
      await Promise.all([
        loadDashboard(token),
        loadSellers(token),
      ]);
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);

    setAdmin(null);
    setDashboard(null);
    setSellers([]);

    navigate("/seller/login", {
      replace: true,
    });
  }

  // =========================================================
  // UPDATE SELLER STATUS
  // =========================================================

  async function handleSellerStatus(seller) {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      handleLogout();
      return;
    }

    const newStatus =
      seller.is_active === false;

    try {
      const response = await fetch(
        `${API_URL}/api/admin/sellers/${seller.id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            is_active: newStatus,
          }),
        }
      );

      if (response.status === 401) {
        handleLogout();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Gagal mengubah status seller."
        );
      }

      // Update seller langsung di UI
      setSellers((currentSellers) =>
        currentSellers.map((item) =>
          item.id === seller.id
            ? data.seller
            : item
        )
      );

      // Refresh statistik
      await loadDashboard(token);
    } catch (error) {
      console.error(
        "Gagal mengubah status seller:",
        error
      );

      setError(
        error.message ||
          "Gagal mengubah status seller."
      );
    }
  }

  // =========================================================
  // FORMAT CURRENCY
  // =========================================================

  function formatRupiah(value) {
    const number = Number(value || 0);

    return new Intl.NumberFormat(
      "id-ID"
    ).format(number);
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="admin-page admin-loading-page">
        <div className="admin-loading-card">
          <div className="admin-spinner" />

          <h2>
            Memeriksa sesi admin...
          </h2>

          <p>
            Sedang memverifikasi akun administrator.
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // SAFETY
  // =========================================================

  if (!admin) {
    return null;
  }

  // =========================================================
  // STATS
  // =========================================================

  const stats = dashboard?.stats || {};

  const totalSellers =
    stats.total_sellers || 0;

  const activeSellers =
    stats.active_sellers || 0;

  const inactiveSellers =
    stats.inactive_sellers || 0;

  const totalMenus =
    stats.total_menus || 0;

  const totalOrders =
    stats.total_orders || 0;

  const totalIncome =
    stats.total_income || 0;

  // =========================================================
  // ADMIN DASHBOARD
  // =========================================================

  return (
    <div className="admin-dashboard">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="admin-dashboard-header">

        <div className="admin-dashboard-brand">

          <div className="admin-brand-icon">
            🍽️
          </div>

          <div>
            <strong>
              Canteenly
            </strong>

            <span>
              Admin Panel
            </span>
          </div>

        </div>

        <div className="admin-account">

          <div className="admin-account-info">

            <strong>
              {admin.name ||
                "Administrator"}
            </strong>

            <span>
              {admin.email ||
                "admin@canteenly.com"}
            </span>

          </div>

          <button
            type="button"
            className="admin-logout-button"
            onClick={handleLogout}
          >
            Keluar
          </button>

        </div>

      </header>

      {/* =====================================================
          CONTENT
      ====================================================== */}

      <main className="admin-dashboard-content">

        {/* TITLE */}

        <div className="admin-dashboard-title">

          <div>

            <span className="admin-eyebrow">
              ADMINISTRATOR
            </span>

            <h1>
              Halo,{" "}
              {admin.name || "Admin"} 👋
            </h1>

            <p>
              Kelola sistem Canteenly dari
              satu dashboard.
            </p>

          </div>

        </div>

        {/* ERROR */}

        {error && (
          <div className="admin-error-banner">
            {error}

            <button
              type="button"
              onClick={() => setError("")}
            >
              ×
            </button>
          </div>
        )}

        {/* ===================================================
            STATS
        ==================================================== */}

        <section className="admin-stats">

          {/* TOTAL SELLER */}

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              🏪
            </div>

            <div>

              <span>
                Total Seller
              </span>

              <strong>
                {dashboardLoading
                  ? "..."
                  : totalSellers}
              </strong>

              <small>
                {activeSellers} aktif
                {inactiveSellers > 0 &&
                  ` • ${inactiveSellers} nonaktif`}
              </small>

            </div>

          </div>

          {/* TOTAL MENU */}

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              🍱
            </div>

            <div>

              <span>
                Total Menu
              </span>

              <strong>
                {dashboardLoading
                  ? "..."
                  : totalMenus}
              </strong>

              <small>
                Menu dalam sistem
              </small>

            </div>

          </div>

          {/* TOTAL ORDER */}

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              🧾
            </div>

            <div>

              <span>
                Total Pesanan
              </span>

              <strong>
                {dashboardLoading
                  ? "..."
                  : totalOrders}
              </strong>

              <small>
                Seluruh pesanan
              </small>

            </div>

          </div>

          {/* INCOME */}

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              💰
            </div>

            <div>

              <span>
                Pendapatan
              </span>

              <strong>
                {dashboardLoading
                  ? "..."
                  : `Rp${formatRupiah(
                      totalIncome
                    )}`}
              </strong>

              <small>
                Pesanan selesai
              </small>

            </div>

          </div>

        </section>

        {/* ===================================================
            CONTENT GRID
        ==================================================== */}

        <section className="admin-content-grid">

          {/* =================================================
              SYSTEM CARD
          ================================================== */}

          <div className="admin-panel-card">

            <div className="admin-panel-header">

              <div>

                <span className="admin-panel-eyebrow">
                  SISTEM
                </span>

                <h2>
                  Canteenly Management
                </h2>

              </div>

              <div className="admin-online-status">
                <span />
                Online
              </div>

            </div>

            <div className="admin-system-list">

              <div className="admin-system-item">

                <div className="admin-system-icon">
                  🏪
                </div>

                <div>

                  <strong>
                    Manajemen Seller
                  </strong>

                  <span>
                    {totalSellers} seller
                    terdaftar
                  </span>

                </div>

                <span className="admin-arrow">
                  →
                </span>

              </div>

              <div className="admin-system-item">

                <div className="admin-system-icon">
                  🍽️
                </div>

                <div>

                  <strong>
                    Manajemen Menu
                  </strong>

                  <span>
                    {totalMenus} menu
                    tersedia
                  </span>

                </div>

                <span className="admin-arrow">
                  →
                </span>

              </div>

              <div className="admin-system-item">

                <div className="admin-system-icon">
                  📦
                </div>

                <div>

                  <strong>
                    Manajemen Pesanan
                  </strong>

                  <span>
                    {totalOrders} pesanan
                    tercatat
                  </span>

                </div>

                <span className="admin-arrow">
                  →
                </span>

              </div>

            </div>

          </div>

          {/* =================================================
              WELCOME CARD
          ================================================== */}

          <div className="admin-welcome-card">

            <div className="admin-welcome-icon">
              🛡️
            </div>

            <span className="admin-panel-eyebrow">
              ADMIN ACCESS
            </span>

            <h2>
              Sistem siap digunakan.
            </h2>

            <p>
              Kamu login sebagai administrator
              Canteenly. Semua pengelolaan sistem
              akan dilakukan dari panel ini.
            </p>

            <div className="admin-account-badge">

              <span className="admin-account-badge-dot" />

              <div>

                <strong>
                  {admin.name ||
                    "Administrator"}
                </strong>

                <small>
                  {admin.email}
                </small>

              </div>

            </div>

          </div>

        </section>

        {/* ===================================================
            SELLER MANAGEMENT
        ==================================================== */}

        <section className="admin-panel-card admin-sellers-panel">

          <div className="admin-panel-header">

            <div>

              <span className="admin-panel-eyebrow">
                SELLER
              </span>

              <h2>
                Daftar Seller
              </h2>

            </div>

            <div className="admin-seller-count">
              {totalSellers} Seller
            </div>

          </div>

          {/* SELLER LOADING */}

          {sellersLoading ? (
            <div className="admin-sellers-loading">

              <div className="admin-spinner" />

              <span>
                Memuat daftar seller...
              </span>

            </div>
          ) : sellers.length === 0 ? (

            /* EMPTY */

            <div className="admin-empty-state">

              <div>
                🏪
              </div>

              <h3>
                Belum ada seller
              </h3>

              <p>
                Belum ada akun seller yang
                terdaftar di sistem.
              </p>

            </div>

          ) : (

            /* SELLER LIST */

            <div className="admin-seller-list">

              {sellers.map((seller) => {

                const isActive =
                  seller.is_active !== false;

                return (
                  <div
                    className="admin-seller-item"
                    key={seller.id}
                  >

                    {/* SELLER AVATAR */}

                    <div className="admin-seller-avatar">

                      {seller.profile_image ? (
                        <img
                          src={
                            seller.profile_image
                          }
                          alt={
                            seller.store_name ||
                            seller.name ||
                            "Seller"
                          }
                        />
                      ) : (
                        <span>
                          🏪
                        </span>
                      )}

                    </div>

                    {/* SELLER INFO */}

                    <div className="admin-seller-info">

                      <div className="admin-seller-name-row">

                        <strong>
                          {seller.store_name ||
                            "Kantin"}
                        </strong>

                        <span
                          className={
                            isActive
                              ? "admin-seller-status active"
                              : "admin-seller-status inactive"
                          }
                        >
                          <span />

                          {isActive
                            ? "Aktif"
                            : "Nonaktif"}
                        </span>

                      </div>

                      <span>
                        {seller.name ||
                          "Seller"}
                      </span>

                      <small>
                        {seller.email ||
                          "-"}
                      </small>

                    </div>

                    {/* ACTION */}

                    <button
                      type="button"
                      className={
                        isActive
                          ? "admin-seller-toggle deactivate"
                          : "admin-seller-toggle activate"
                      }
                      onClick={() =>
                        handleSellerStatus(
                          seller
                        )
                      }
                    >
                      {isActive
                        ? "Nonaktifkan"
                        : "Aktifkan"}
                    </button>

                  </div>
                );
              })}

            </div>
          )}

        </section>

      </main>

    </div>
  );
}

export default Admin;
