import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Admin.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://canteenly.fastapicloud.dev";

const TOKEN_KEY = "canteenly_seller_token";
const SELLER_KEY = "canteenly_seller";

function Admin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [seller, setSeller] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);

  const [error, setError] = useState("");

  // =========================================================
  // CHECK SESSION
  // =========================================================

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    const token =
      localStorage.getItem(TOKEN_KEY);

    const savedSeller =
      localStorage.getItem(SELLER_KEY);

    /*
     * Tidak ada token berarti belum login
     */
    if (!token) {
      setLoading(false);
      return;
    }

    /*
     * Tampilkan data seller dari localStorage
     * terlebih dahulu agar halaman tidak terasa kosong
     */
    if (savedSeller) {
      try {
        setSeller(
          JSON.parse(savedSeller)
        );
      } catch {
        localStorage.removeItem(
          SELLER_KEY
        );
      }
    }

    try {
      const response = await fetch(
        `${API_URL}/api/sellers/me`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      /*
       * Token sudah tidak valid
       */
      if (!response.ok) {
        localStorage.removeItem(
          TOKEN_KEY
        );

        localStorage.removeItem(
          SELLER_KEY
        );

        setSeller(null);
        setLoading(false);

        return;
      }

      const data =
        await response.json();

      /*
       * Update data seller terbaru
       */
      if (data.seller) {
        setSeller(data.seller);

        localStorage.setItem(
          SELLER_KEY,
          JSON.stringify(
            data.seller
          )
        );
      }
    } catch (err) {
      console.error(
        "Gagal mengecek session:",
        err
      );

      /*
       * Jangan langsung logout kalau
       * server sedang tidak bisa diakses.
       *
       * Kalau data seller masih ada di
       * localStorage, user tetap dianggap
       * login sementara.
       */
      if (!savedSeller) {
        setError(
          "Tidak dapat terhubung ke server."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // LOGIN
  // =========================================================

  async function handleLogin(event) {
    event.preventDefault();

    setError("");

    if (
      !email.trim() ||
      !password.trim()
    ) {
      setError(
        "Email dan password wajib diisi."
      );

      return;
    }

    try {
      setLoginLoading(true);

      const response =
        await fetch(
          `${API_URL}/api/sellers/login`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              email:
                email.trim(),
              password,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Email atau password salah."
        );
      }

      if (!data.access_token) {
        throw new Error(
          "Token login tidak ditemukan."
        );
      }

      /*
       * Gunakan key yang SAMA dengan
       * SellerLogin.jsx
       */
      localStorage.setItem(
        TOKEN_KEY,
        data.access_token
      );

      /*
       * Simpan data seller
       */
      if (data.seller) {
        localStorage.setItem(
          SELLER_KEY,
          JSON.stringify(
            data.seller
          )
        );

        setSeller(
          data.seller
        );
      }

      setPassword("");

      /*
       * Login berhasil.
       *
       * Tidak perlu navigate ke Seller Dashboard
       * karena Admin punya dashboard sendiri.
       */
    } catch (err) {
      console.error(
        "Admin login error:",
        err
      );

      setError(
        err.message ||
          "Tidak dapat terhubung ke server."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  function handleLogout() {
    localStorage.removeItem(
      TOKEN_KEY
    );

    localStorage.removeItem(
      SELLER_KEY
    );

    setSeller(null);

    setEmail("");
    setPassword("");
    setError("");
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
            Memeriksa sesi...
          </h2>

          <p>
            Tunggu sebentar, sedang
            memeriksa akun admin.
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // LOGIN
  // =========================================================

  if (!seller) {
    return (
      <div className="admin-page">
        <div className="admin-background-shape admin-shape-one" />
        <div className="admin-background-shape admin-shape-two" />

        <main className="admin-login-wrapper">
          <section className="admin-login-card">

            {/* BRAND */}

            <div className="admin-brand">
              <div className="admin-brand-icon">
                🍽️
              </div>

              <div>
                <span className="admin-brand-name">
                  Canteenly
                </span>

                <span className="admin-brand-label">
                  ADMIN PANEL
                </span>
              </div>
            </div>

            {/* HEADING */}

            <div className="admin-login-heading">
              <p className="admin-eyebrow">
                MANAGEMENT SYSTEM
              </p>

              <h1>
                Selamat datang kembali.
              </h1>

              <p>
                Masuk untuk mengelola toko,
                menu, dan pesanan Canteenly.
              </p>
            </div>

            {/* FORM */}

            <form
              className="admin-login-form"
              onSubmit={handleLogin}
            >
              {error && (
                <div className="admin-error">
                  <span className="admin-error-icon">
                    !
                  </span>

                  <span>
                    {error}
                  </span>
                </div>
              )}

              {/* EMAIL */}

              <div className="admin-field">
                <label htmlFor="admin-email">
                  Email
                </label>

                <div className="admin-input-wrapper">
                  <span className="admin-input-icon">
                    ✉
                  </span>

                  <input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="contoh@kantin.com"
                    autoComplete="email"
                    disabled={
                      loginLoading
                    }
                    required
                  />
                </div>
              </div>

              {/* PASSWORD */}

              <div className="admin-field">
                <label htmlFor="admin-password">
                  Password
                </label>

                <div className="admin-input-wrapper">
                  <span className="admin-input-icon">
                    🔒
                  </span>

                  <input
                    id="admin-password"
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    disabled={
                      loginLoading
                    }
                    required
                  />
                </div>
              </div>

              {/* LOGIN BUTTON */}

              <button
                className="admin-login-button"
                type="submit"
                disabled={
                  loginLoading
                }
              >
                {loginLoading ? (
                  <>
                    <span className="admin-button-spinner" />

                    Memproses...
                  </>
                ) : (
                  <>
                    Masuk ke Dashboard

                    <span>
                      →
                    </span>
                  </>
                )}
              </button>
            </form>

            {/* FOOTER */}

            <div className="admin-login-footer">
              <span className="admin-status-dot" />

              Canteenly Management System
            </div>
          </section>

          {/* VISUAL */}

          <section className="admin-login-visual">
            <div className="admin-visual-content">

              <span className="admin-visual-badge">
                SMART CANTEEN
              </span>

              <h2>
                Kelola kantin.
                <br />
                Lebih sederhana.
              </h2>

              <p>
                Pantau pesanan, kelola menu,
                dan atur toko dari satu
                dashboard.
              </p>

              <div className="admin-feature-list">

                <div className="admin-feature">
                  <span>✓</span>

                  <div>
                    <strong>
                      Manajemen Pesanan
                    </strong>

                    <small>
                      Pantau pesanan secara
                      real-time
                    </small>
                  </div>
                </div>

                <div className="admin-feature">
                  <span>✓</span>

                  <div>
                    <strong>
                      Kelola Menu
                    </strong>

                    <small>
                      Atur menu dan
                      ketersediaannya
                    </small>
                  </div>
                </div>

                <div className="admin-feature">
                  <span>✓</span>

                  <div>
                    <strong>
                      Dashboard Toko
                    </strong>

                    <small>
                      Lihat performa toko
                      dengan mudah
                    </small>
                  </div>
                </div>

              </div>
            </div>

            <div className="admin-visual-decoration admin-decoration-one" />

            <div className="admin-visual-decoration admin-decoration-two" />

            <div className="admin-food-card">
              <span>🍜</span>

              <div>
                <strong>
                  Pesanan Baru
                </strong>

                <small>
                  Siap diproses
                </small>
              </div>

              <b>
                +3
              </b>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // =========================================================
  // ADMIN DASHBOARD
  // =========================================================

  return (
    <div className="admin-dashboard">

      {/* HEADER */}

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
              {
                seller.store_name ||
                seller.storeName ||
                "Kantin"
              }
            </strong>

            <span>
              {
                seller.name ||
                seller.email
              }
            </span>
          </div>

          <button
            type="button"
            className="admin-logout-button"
            onClick={
              handleLogout
            }
          >
            Keluar
          </button>

        </div>
      </header>

      {/* CONTENT */}

      <main className="admin-dashboard-content">

        <div className="admin-dashboard-title">
          <div>
            <span className="admin-eyebrow">
              DASHBOARD
            </span>

            <h1>
              Halo,{" "}
              {seller.name ||
                "Admin"}{" "}
              👋
            </h1>

            <p>
              Kelola aktivitas kantin
              dari sini.
            </p>
          </div>
        </div>

        {/* STATS */}

        <section className="admin-stats">

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              🧾
            </div>

            <div>
              <span>
                Total Pesanan
              </span>

              <strong>
                0
              </strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              ⏳
            </div>

            <div>
              <span>
                Pesanan Menunggu
              </span>

              <strong>
                0
              </strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              🍱
            </div>

            <div>
              <span>
                Siap Diambil
              </span>

              <strong>
                0
              </strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              💰
            </div>

            <div>
              <span>
                Pendapatan Hari Ini
              </span>

              <strong>
                Rp0
              </strong>
            </div>
          </div>

        </section>

        {/* EMPTY DASHBOARD */}

        <section className="admin-empty-card">

          <div className="admin-empty-icon">
            📊
          </div>

          <h2>
            Dashboard admin siap digunakan
          </h2>

          <p>
            Statistik, pesanan, dan
            pengelolaan menu akan
            ditampilkan di area ini.
          </p>

        </section>
      </main>
    </div>
  );
}

export default Admin;