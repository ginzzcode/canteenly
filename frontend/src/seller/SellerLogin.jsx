
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  Eye,
  EyeOff,
  ArrowRight,
  LockKeyhole,
  LoaderCircle,
  ArrowLeft,
} from "lucide-react";
import "../styles/SellerLogin.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://canteenly.fastapicloud.dev";

function SellerLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }

    setLoading(true);

    /*
     * =====================================================
     * 1. COBA LOGIN SEBAGAI SELLER
     * =====================================================
     */

    try {
      const sellerResponse = await fetch(
        `${API_URL}/api/sellers/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: trimmedEmail,
            password,
          }),
        }
      );

      let sellerData = {};

      try {
        sellerData = await sellerResponse.json();
      } catch {
        sellerData = {};
      }

      if (sellerResponse.ok && sellerData.access_token) {
        /*
         * Hapus session admin lama.
         */
        localStorage.removeItem(
          "canteenly_admin_token"
        );

        localStorage.removeItem(
          "canteenly_admin"
        );

        /*
         * Simpan session seller.
         */
        localStorage.setItem(
          "canteenly_seller_token",
          sellerData.access_token
        );

        if (sellerData.seller) {
          localStorage.setItem(
            "canteenly_seller",
            JSON.stringify(sellerData.seller)
          );
        }

        /*
         * Seller berhasil login.
         */
        navigate("/seller/dashboard", {
          replace: true,
        });

        return;
      }
    } catch (sellerError) {
      console.error(
        "Seller login request error:",
        sellerError
      );
    }

    /*
     * =====================================================
     * 2. KALAU BUKAN SELLER, COBA LOGIN SEBAGAI ADMIN
     * =====================================================
     */

    try {
      const adminResponse = await fetch(
        `${API_URL}/api/admin/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: trimmedEmail,
            password,
          }),
        }
      );

      let adminData = {};

      try {
        adminData = await adminResponse.json();
      } catch {
        adminData = {};
      }

      if (adminResponse.ok && adminData.access_token) {
        /*
         * Hapus session seller lama.
         */
        localStorage.removeItem(
          "canteenly_seller_token"
        );

        localStorage.removeItem(
          "canteenly_seller"
        );

        /*
         * Simpan session admin.
         */
        localStorage.setItem(
          "canteenly_admin_token",
          adminData.access_token
        );

        if (adminData.admin) {
          localStorage.setItem(
            "canteenly_admin",
            JSON.stringify(adminData.admin)
          );
        }

        /*
         * Admin berhasil login.
         */
        navigate("/admin", {
          replace: true,
        });

        return;
      }

      /*
       * Kedua login gagal.
       */
      setError(
        adminData.detail ||
          "Email atau password salah."
      );
    } catch (adminError) {
      console.error(
        "Admin login request error:",
        adminError
      );

      setError(
        "Tidak dapat terhubung ke server."
      );
    } finally {
      setLoading(false);
    }
  };

  function handleBack() {
    navigate("/");
  }

  return (
    <div className="seller-login-page">
      <div className="seller-login-decoration decoration-one" />
      <div className="seller-login-decoration decoration-two" />

      <div className="seller-login-card">
        <div className="seller-login-logo">
          <ShoppingBag
            size={24}
            strokeWidth={2.5}
          />
        </div>

        <div className="seller-login-heading">
          <span>SELLER & ADMIN AREA</span>

          <h1>Selamat datang kembali.</h1>

          <p>
            Masuk untuk mengelola toko dan
            Canteenly.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="seller-form-group">
            <label htmlFor="seller-email">
              Email
            </label>

            <input
              id="seller-email"
              type="email"
              placeholder="Email akun"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="seller-form-group">
            <label htmlFor="seller-password">
              Password
            </label>

            <div className="seller-password-wrapper">
              <input
                id="seller-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Masukkan password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                autoComplete="current-password"
                disabled={loading}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(
                    (current) => !current
                  )
                }
                aria-label={
                  showPassword
                    ? "Sembunyikan password"
                    : "Tampilkan password"
                }
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="seller-login-error">
              {error}
            </div>
          )}

          <button
            className="seller-login-button"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle
                  size={18}
                  className="seller-login-spinner"
                />

                Memproses...
              </>
            ) : (
              <>
                Masuk Dashboard
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <button
          type="button"
          className="seller-back-button"
          onClick={handleBack}
          disabled={loading}
        >
          <ArrowLeft size={15} />

          Kembali ke halaman utama
        </button>

        <div className="seller-login-security">
          <LockKeyhole size={14} />

          <span>
            Akses khusus seller dan administrator
            Canteenly
          </span>
        </div>
      </div>
    </div>
  );
}

export default SellerLogin;
