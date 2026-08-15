import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/Checkout.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();

  const store = location.state?.store;
  const cart = location.state?.cart || [];
  const total = Number(location.state?.total || 0);

  const [customerName, setCustomerName] = useState("");
  const [customerClass, setCustomerClass] = useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("Bayar di tempat");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cartItemCount = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );
  }, [cart]);

  function formatPrice(price) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(price || 0));
  }

  function handleBack() {
    if (store?.id) {
      navigate(`/buyer/store/${store.id}`);
      return;
    }

    navigate("/buyer");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    const name = customerName.trim();
    const className = customerClass.trim();

    if (!name) {
      setError("Nama pembeli wajib diisi.");
      return;
    }

    if (!className) {
      setError("Kelas pembeli wajib diisi.");
      return;
    }

    if (!store?.id) {
      setError("Data kantin tidak ditemukan.");
      return;
    }

    if (cart.length === 0) {
      setError("Keranjang kamu masih kosong.");
      return;
    }

    if (paymentMethod !== "Bayar di tempat") {
      setError("Metode pembayaran tersebut belum tersedia.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/public/orders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            seller_id: store.id,

            customer_name: name,

            customer_class: className,

            items: cart.map((item) => ({
              menu_id: item.id,
              quantity: Number(item.quantity),
            })),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Pesanan gagal dibuat."
        );
      }

      const createdOrder = data.order;

      if (!createdOrder?.id) {
        throw new Error(
          "Server tidak mengembalikan data pesanan."
        );
      }

      localStorage.setItem(
        "canteenly_active_order",
        JSON.stringify({
          id: createdOrder.id,
          code: createdOrder.code,
          customer_name: name,
          customer_class: className,
          created_at: createdOrder.created_at,
        })
      );

      navigate("/buyer/order-success", {
        replace: true,
        state: {
          order: createdOrder,
        },
      });
    } catch (err) {
      console.error(
        "Checkout error:",
        err
      );

      setError(
        err.message ||
          "Pesanan gagal dibuat."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!store || cart.length === 0) {
    return (
      <div className="checkout-page">
        <header className="checkout-header">
          <button
            type="button"
            className="checkout-back-button"
            onClick={() => navigate("/buyer")}
          >
            ←
          </button>

          <div className="checkout-header-info">
            <strong>Canteenly</strong>
            <span>Checkout</span>
          </div>
        </header>

        <main className="checkout-content">
          <section className="checkout-empty-card">
            <div className="checkout-empty-icon">
              🛒
            </div>

            <h2>Checkout tidak tersedia</h2>

            <p>
              Tidak ada pesanan yang perlu
              diproses.
            </p>

            <button
              type="button"
              onClick={() => navigate("/buyer")}
              className="checkout-primary-button"
            >
              Kembali ke dashboard
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      {/* HEADER */}
      <header className="checkout-header">
        <button
          type="button"
          className="checkout-back-button"
          onClick={handleBack}
          disabled={loading}
          aria-label="Kembali"
        >
          ←
        </button>

        <div className="checkout-header-info">
          <strong>Canteenly</strong>
          <span>Konfirmasi pesanan</span>
        </div>
      </header>

      <main className="checkout-content">
        <div className="checkout-title">
          <span className="checkout-eyebrow">
            CHECKOUT
          </span>

          <h1>
            Konfirmasi pesanan
          </h1>

          <p>
            Isi data kamu sebelum pesanan
            dikirim ke kantin.
          </p>
        </div>

        {/* CUSTOMER */}
        <section className="checkout-section">
          <div className="checkout-section-heading">
            <div className="checkout-section-number">
              1
            </div>

            <div>
              <h2>Data pembeli</h2>

              <p>
                Data ini digunakan saat
                pengambilan pesanan.
              </p>
            </div>
          </div>

          <div className="checkout-form">
            <label className="checkout-field">
              <span>
                Nama lengkap
              </span>

              <input
                type="text"
                placeholder="Contoh: Budi"
                value={customerName}
                onChange={(event) =>
                  setCustomerName(
                    event.target.value
                  )
                }
                maxLength={100}
                autoComplete="name"
                disabled={loading}
              />
            </label>

            <label className="checkout-field">
              <span>
                Kelas
              </span>

              <input
                type="text"
                placeholder="Contoh: 8A"
                value={customerClass}
                onChange={(event) =>
                  setCustomerClass(
                    event.target.value
                  )
                }
                maxLength={50}
                disabled={loading}
              />
            </label>

            <div className="checkout-info-box">
              <span>Info</span>

              <p>
                Saat mengambil makanan di
                kantin, cukup sebutkan:
                <strong>
                  {" "}
                  "Pesanan{" "}
                  {customerName.trim() || "(nama)"}{" "}
                  {customerClass.trim() || "(kelas)"}
                </strong>
              </p>
            </div>
          </div>
        </section>

        {/* ORDER */}
        <section className="checkout-section">
          <div className="checkout-section-heading">
            <div className="checkout-section-number">
              2
            </div>

            <div>
              <h2>Detail pesanan</h2>

              <p>
                Pesanan dari{" "}
                <strong>
                  {store.store_name ||
                    "Kantin"}
                </strong>
              </p>
            </div>
          </div>

          <div className="checkout-order-card">
            <div className="checkout-store-header">
              <div className="checkout-store-icon">
                K
              </div>

              <div>
                <strong>
                  {store.store_name ||
                    "Kantin"}
                </strong>

                <span>
                  {cartItemCount} item
                </span>
              </div>
            </div>

            <div className="checkout-items">
              {cart.map((item) => (
                <div
                  className="checkout-item"
                  key={item.id}
                >
                  <div className="checkout-item-left">
                    <strong>
                      {item.name}
                    </strong>

                    <span>
                      {formatPrice(
                        item.price
                      )}{" "}
                      × {item.quantity}
                    </span>
                  </div>

                  <strong>
                    {formatPrice(
                      Number(item.price || 0) *
                        Number(
                          item.quantity || 0
                        )
                    )}
                  </strong>
                </div>
              ))}
            </div>

            <div className="checkout-total">
              <span>
                Total pembayaran
              </span>

              <strong>
                {formatPrice(total)}
              </strong>
            </div>
          </div>
        </section>

        {/* PAYMENT */}
        <section className="checkout-section">
          <div className="checkout-section-heading">
            <div className="checkout-section-number">
              3
            </div>

            <div>
              <h2>Metode pembayaran</h2>

              <p>
                Pilih cara pembayaran pesanan.
              </p>
            </div>
          </div>

          <div className="checkout-payment-list">
            {/* BAYAR DI TEMPAT */}
            <button
              type="button"
              className={`checkout-payment-card ${
                paymentMethod === "Bayar di tempat"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setPaymentMethod("Bayar di tempat")
              }
              disabled={loading}
            >
              <div className="checkout-payment-radio">
                <span />
              </div>

              <div className="checkout-payment-icon">
                Tunai
              </div>

              <div className="checkout-payment-info">
                <strong>
                  Bayar di tempat
                </strong>

                <span>
                  Bayar langsung saat mengambil
                  pesanan di kantin.
                </span>
              </div>

              <span className="checkout-payment-status available">
                Tersedia
              </span>
            </button>

            {/* QRIS */}
            <button
              type="button"
              className="checkout-payment-card disabled"
              disabled
            >
              <div className="checkout-payment-radio">
                <span />
              </div>

              <div className="checkout-payment-icon">
                QRIS
              </div>

              <div className="checkout-payment-info">
                <strong>
                  QRIS
                </strong>

                <span>
                  Pembayaran digital melalui
                  QRIS.
                </span>
              </div>

              <span className="checkout-payment-status">
                Segera mendatang
              </span>
            </button>
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div className="checkout-error">
            <span>!</span>

            <p>{error}</p>
          </div>
        )}

        {/* SUBMIT */}
        <section className="checkout-confirm-section">
          <div className="checkout-confirm-note">
            <span>Catatan</span>

            <p>
              Pesanan akan langsung dikirim
              ke kantin setelah dikonfirmasi.
            </p>
          </div>

          <button
            type="button"
            className="checkout-confirm-button"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="checkout-spinner" />
                Membuat pesanan...
              </>
            ) : (
              <>
                Konfirmasi Pesanan
                <span>→</span>
              </>
            )}
          </button>
        </section>
      </main>
    </div>
  );
}

export default Checkout;