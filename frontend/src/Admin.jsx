
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
  // ADD SELLER
  // =========================================================

  const [showAddSeller, setShowAddSeller] = useState(false);
  const [addSellerLoading, setAddSellerLoading] = useState(false);

  const [sellerForm, setSellerForm] = useState({
    name: "",
    email: "",
    password: "",
    store_name: "",
  });

  const [sellerFormError, setSellerFormError] = useState("");

  // =========================================================
  // LOAD DASHBOARD
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
  // ADD SELLER FORM
  // =========================================================

  function handleSellerFormChange(event) {
    const { name, value } = event.target;

    setSellerForm((current) => ({
      ...current,
      [name]: value,
    }));

    setSellerFormError("");
  }

  function openAddSeller() {
    setSellerForm({
      name: "",
      email: "",
      password: "",
      store_name: "",
    });

    setSellerFormError("");
    setShowAddSeller(true);
  }

  function closeAddSeller() {
    if (addSellerLoading) return;

    setShowAddSeller(false);
    setSellerFormError("");
  }

  async function handleAddSeller(event) {
    event.preventDefault();

    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      handleLogout();
      return;
    }

    const name = sellerForm.name.trim();
    const email = sellerForm.email.trim().toLowerCase();
    const password = sellerForm.password;
    const storeName = sellerForm.store_name.trim();

    if (!name || !email || !password || !storeName) {
      setSellerFormError(
        "Semua field wajib diisi."
      );
      return;
    }

    if (password.length < 6) {
      setSellerFormError(
        "Password minimal 6 karakter."
      );
      return;
    }

    setAddSellerLoading(true);
    setSellerFormError("");

    try {
      const response = await fetch(
        `${API_URL}/api/admin/sellers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
            email,
            password,
            store_name: storeName,
          }),
        }
      );

      if (response.status === 401) {
        handleLogout();
        return;
      }

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Gagal menambahkan seller."
        );
      }

      setShowAddSeller(false);

      setSellerForm({
        name: "",
        email: "",
        password: "",
        store_name: "",
      });

      await Promise.all([
        loadSellers(token),
        loadDashboard(token),
      ]);
    } catch (error) {
      console.error(
        "Gagal menambahkan seller:",
        error
      );

      setSellerFormError(
        error.message ||
          "Gagal menambahkan seller."
      );
    } finally {
      setAddSellerLoading(false);
    }
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

      setSellers((currentSellers) =>
        currentSellers.map((item) =>
          item.id === seller.id
            ? data.seller
            : item
        )
      );

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
  // RENDER
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
            <strong>Canteenly</strong>
            <span>Admin Panel</span>
          </div>
        </div>

        <div className="admin-account">

          <div className="admin-account-info">
            <strong>
              {admin.name || "Administrator"}
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
      Halo, {admin.name || "Admin"} 👋
    </h1>

    <p>
      Kelola sistem Canteenly dari satu dashboard.
    </p>
  </div>
</div>

        {/* ERROR */}

        {error && (
          <div className="admin-error-banner">
            <span>{error}</span>

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

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              🏪
            </div>

            <div>
              <span>Total Seller</span>

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

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              🍱
            </div>

            <div>
              <span>Total Menu</span>

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

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              🧾
            </div>

            <div>
              <span>Total Pesanan</span>

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

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              💰
            </div>

            <div>
              <span>Pendapatan</span>

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
            ADMIN SUMMARY
        ==================================================== */}

        <section className="admin-panel-card admin-summary-panel">

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

          <div className="admin-summary-content">

            <div className="admin-summary-icon">
              🛡️
            </div>

            <div className="admin-summary-text">
              <strong>
                Panel administrator aktif
              </strong>

              <span>
                Gunakan panel ini untuk
                mengelola akun seller Canteenly.
              </span>
            </div>

            <div className="admin-summary-badge">
              {totalSellers} Seller
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

            <div className="admin-seller-header-actions">

              <div className="admin-seller-count">
                {totalSellers} Seller
              </div>

              <button
                type="button"
                className="admin-add-seller-small"
                onClick={openAddSeller}
              >
                ＋ Tambah
              </button>

            </div>

          </div>

          {/* LOADING */}

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

              <button
                type="button"
                className="admin-empty-add-button"
                onClick={openAddSeller}
              >
                ＋ Tambah Seller
              </button>

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

                    <div className="admin-seller-avatar">

                      {seller.profile_image ? (
                        <img
                          src={seller.profile_image}
                          alt={
                            seller.store_name ||
                            seller.name ||
                            "Seller"
                          }
                        />
                      ) : (
                        <span>🏪</span>
                      )}

                    </div>

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
                        {seller.email || "-"}
                      </small>

                    </div>

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

      {/* =====================================================
          ADD SELLER MODAL
      ====================================================== */}

      {showAddSeller && (
        <div
          className="admin-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !addSellerLoading
            ) {
              closeAddSeller();
            }
          }}
        >

          <div className="admin-modal">

            <div className="admin-modal-header">

              <div>
                <span className="admin-panel-eyebrow">
                  SELLER
                </span>

                <h2>
                  Tambah Seller
                </h2>

                <p>
                  Buat akun seller baru untuk
                  Canteenly.
                </p>
              </div>

              <button
                type="button"
                className="admin-modal-close"
                onClick={closeAddSeller}
                disabled={addSellerLoading}
              >
                ×
              </button>

            </div>

            <form
              className="admin-seller-form"
              onSubmit={handleAddSeller}
            >

              <div className="admin-form-group">

                <label htmlFor="seller-name">
                  Nama Seller
                </label>

                <input
                  id="seller-name"
                  name="name"
                  type="text"
                  placeholder="Contoh: Budi"
                  value={sellerForm.name}
                  onChange={handleSellerFormChange}
                  disabled={addSellerLoading}
                  autoComplete="name"
                />

              </div>

              <div className="admin-form-group">

                <label htmlFor="seller-store-name">
                  Nama Kantin
                </label>

                <input
                  id="seller-store-name"
                  name="store_name"
                  type="text"
                  placeholder="Contoh: Kantin Bu Budi"
                  value={sellerForm.store_name}
                  onChange={handleSellerFormChange}
                  disabled={addSellerLoading}
                />

              </div>

              <div className="admin-form-group">

                <label htmlFor="seller-email">
                  Email
                </label>

                <input
                  id="seller-email"
                  name="email"
                  type="email"
                  placeholder="seller@example.com"
                  value={sellerForm.email}
                  onChange={handleSellerFormChange}
                  disabled={addSellerLoading}
                  autoComplete="email"
                />

              </div>

              <div className="admin-form-group">

                <label htmlFor="seller-password">
                  Password
                </label>

                <input
                  id="seller-password"
                  name="password"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={sellerForm.password}
                  onChange={handleSellerFormChange}
                  disabled={addSellerLoading}
                  autoComplete="new-password"
                />

              </div>

              {sellerFormError && (
                <div className="admin-form-error">
                  {sellerFormError}
                </div>
              )}

              <div className="admin-modal-actions">

                <button
                  type="button"
                  className="admin-cancel-button"
                  onClick={closeAddSeller}
                  disabled={addSellerLoading}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="admin-submit-button"
                  disabled={addSellerLoading}
                >
                  {addSellerLoading ? (
                    <>
                      <span className="admin-button-spinner" />
                      Menambahkan...
                    </>
                  ) : (
                    <>
                      ＋ Tambah Seller
                    </>
                  )}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

export default Admin;