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

    if (!email.trim() || !password.trim()) {
      setError("Email dan password wajib diisi.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/sellers/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Email atau password salah."
        );
      }

      /*
       * Simpan token seller
       */
      localStorage.setItem(
        "canteenly_seller_token",
        data.access_token
      );

      /*
       * Simpan data seller
       */
      localStorage.setItem(
        "canteenly_seller",
        JSON.stringify(data.seller)
      );

      /*
       * Login berhasil
       * Langsung masuk ke Seller Dashboard
       */
      navigate("/seller/dashboard", {
        replace: true,
      });
    } catch (error) {
      console.error("Seller login error:", error);

      setError(
        error.message ||
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
          <span>SELLER AREA</span>

          <h1>Selamat datang kembali.</h1>

          <p>
            Masuk ke dashboard untuk mengelola
            pesanan dan menu kantinmu.
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
              placeholder="contoh@kantin.com"
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
            Area khusus penjual Canteenly
          </span>
        </div>
      </div>
    </div>
  );
}

export default SellerLogin;