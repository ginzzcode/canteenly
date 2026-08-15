import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/OrderSuccess.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function OrderSuccess() {
  const navigate = useNavigate();
  const location = useLocation();

  const initialOrder = location.state?.order || null;

  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(!initialOrder);
  const [error, setError] = useState("");

  const [notificationPermission, setNotificationPermission] =
    useState(
      typeof Notification !== "undefined"
        ? Notification.permission
        : "unsupported"
    );

  useEffect(() => {
    if (!initialOrder) {
      loadSavedOrder();
    }
  }, []);

  useEffect(() => {
    if (!order?.id) {
      return;
    }

    localStorage.setItem(
      "canteenly_active_order",
      JSON.stringify({
        id: order.id,
        code: order.code,
        customer_name: order.customer,
        customer_class: order.className,
        created_at: order.created_at,
      })
    );
  }, [order]);

  useEffect(() => {
    if (!order?.id) {
      return;
    }

    const interval = setInterval(() => {
      refreshOrder(order.id);
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [order?.id]);

  useEffect(() => {
    if (order?.status === "Siap diambil") {
      sendReadyNotification();
    }
  }, [order?.status]);

  async function loadSavedOrder() {
    try {
      setLoading(true);
      setError("");

      const saved = localStorage.getItem(
        "canteenly_active_order"
      );

      if (!saved) {
        throw new Error(
          "Pesanan aktif tidak ditemukan."
        );
      }

      const savedOrder = JSON.parse(saved);

      if (!savedOrder?.id) {
        throw new Error(
          "Data pesanan tidak valid."
        );
      }

      await refreshOrder(savedOrder.id, true);
    } catch (err) {
      console.error(
        "Load saved order error:",
        err
      );

      setError(
        err.message ||
          "Pesanan tidak dapat dimuat."
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshOrder(
    orderId,
    isInitial = false
  ) {
    try {
      const response = await fetch(
        `${API_URL}/api/public/orders/id/${orderId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Gagal mengambil status pesanan."
        );
      }

      if (data.order) {
        setOrder(data.order);
      }
    } catch (err) {
      console.error(
        "Refresh order error:",
        err
      );

      if (isInitial) {
        setError(
          err.message ||
            "Pesanan tidak dapat dimuat."
        );
      }
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  }

  async function requestNotificationPermission() {
    if (
      typeof Notification ===
      "undefined"
    ) {
      return;
    }

    if (
      Notification.permission ===
      "granted"
    ) {
      setNotificationPermission("granted");
      return;
    }

    if (
      Notification.permission ===
      "denied"
    ) {
      setNotificationPermission("denied");
      return;
    }

    try {
      const permission =
        await Notification.requestPermission();

      setNotificationPermission(
        permission
      );
    } catch (err) {
      console.error(
        "Notification permission error:",
        err
      );
    }
  }

  function sendReadyNotification() {
    if (
      typeof Notification ===
      "undefined"
    ) {
      return;
    }

    if (
      Notification.permission !==
      "granted"
    ) {
      return;
    }

    const notificationKey =
      `canteenly_notified_${order.id}_ready`;

    if (
      localStorage.getItem(
        notificationKey
      )
    ) {
      return;
    }

    try {
      new Notification(
        "Pesanan siap diambil",
        {
          body: `Pesanan ${order.code} sudah siap diambil di ${order.seller_name}.`,
          tag: notificationKey,
        }
      );

      localStorage.setItem(
        notificationKey,
        "true"
      );
    } catch (err) {
      console.error(
        "Notification error:",
        err
      );
    }
  }

  function formatPrice(price) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(price || 0));
  }

  function getStatusClass(status) {
    switch (status) {
      case "Diproses":
        return "processing";

      case "Siap diambil":
        return "ready";

      case "Selesai":
        return "completed";

      case "Dibatalkan":
        return "cancelled";

      default:
        return "waiting";
    }
  }

  function getStatusTitle(status) {
    switch (status) {
      case "Diproses":
        return "Pesanan sedang diproses";

      case "Siap diambil":
        return "Pesanan siap diambil";

      case "Selesai":
        return "Pesanan selesai";

      case "Dibatalkan":
        return "Pesanan dibatalkan";

      default:
        return "Pesanan menunggu diproses";
    }
  }

  function getStatusDescription(status) {
    switch (status) {
      case "Diproses":
        return "Seller sedang menyiapkan pesanan kamu.";

      case "Siap diambil":
        return "Pesanan kamu sudah siap. Silakan ambil di kantin.";

      case "Selesai":
        return "Pesanan ini sudah selesai.";

      case "Dibatalkan":
        return "Pesanan ini dibatalkan oleh seller.";

      default:
        return "Pesanan sudah diterima dan menunggu diproses oleh seller.";
    }
  }

  function handleBackToDashboard() {
    navigate("/buyer");
  }

  if (loading) {
    return (
      <div className="order-success-page">
        <div className="order-success-loading">
          <div className="order-success-spinner" />

          <h2>
            Memuat pesanan...
          </h2>

          <p>
            Sedang mengambil status
            pesanan kamu.
          </p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="order-success-page">
        <div className="order-success-error">
          <div className="order-success-error-icon">
            !
          </div>

          <h2>
            Pesanan tidak ditemukan
          </h2>

          <p>
            {error ||
              "Data pesanan tidak tersedia."}
          </p>

          <button
            type="button"
            onClick={
              handleBackToDashboard
            }
          >
            Kembali ke dashboard
          </button>
        </div>
      </div>
    );
  }

  const statusClass =
    getStatusClass(order.status);

  return (
    <div className="order-success-page">
      {/* HEADER */}
      <header className="order-success-header">
        <button
          type="button"
          className="order-success-back"
          onClick={
            handleBackToDashboard
          }
        >
          ←
        </button>

        <div>
          <strong>Canteenly</strong>

          <span>
            Status pesanan
          </span>
        </div>
      </header>

      <main className="order-success-content">
        {/* STATUS */}
        <section
          className={`order-status-card ${statusClass}`}
        >
          <div className="order-status-visual">
            <div className="order-visual-circle">
              <div className="order-visual-bag">
                <div className="order-visual-bag-handle" />

                <div className="order-visual-bag-body">
                  <span />
                  <span />
                </div>
              </div>

              <div className="order-visual-check">
                {order.status ===
                "Dibatalkan"
                  ? "×"
                  : "✓"}
              </div>
            </div>
          </div>

          <span className="order-status-label">
            STATUS PESANAN
          </span>

          <h1>
            {getStatusTitle(
              order.status
            )}
          </h1>

          <p>
            {getStatusDescription(
              order.status
            )}
          </p>

          <div className="order-status-code">
            <span>
              Kode pesanan
            </span>

            <strong>
              {order.code}
            </strong>
          </div>
        </section>

        {/* CUSTOMER */}
        <section className="order-info-card">
          <div className="order-card-heading">
            <div>
              <span>
                PEMESAN
              </span>

              <h2>
                Data pengambilan
              </h2>
            </div>
          </div>

          <div className="order-customer-grid">
            <div>
              <span>
                Nama
              </span>

              <strong>
                {order.customer}
              </strong>
            </div>

            <div>
              <span>
                Kelas
              </span>

              <strong>
                {order.className}
              </strong>
            </div>
          </div>

          <div className="order-pickup-note">
            <span>!</span>

            <p>
              Saat mengambil pesanan,
              katakan:
              <strong>
                {" "}
                "Pesanan{" "}
                {order.customer}{" "}
                {order.className}"
              </strong>
            </p>
          </div>
        </section>

        {/* STORE */}
        <section className="order-info-card">
          <div className="order-store">
            <div className="order-store-icon">
              C
            </div>

            <div>
              <span>
                KANTIN
              </span>

              <strong>
                {order.seller_name}
              </strong>
            </div>
          </div>

          <div className="order-items">
            {(order.items || []).map(
              (item, index) => (
                <div
                  className="order-item"
                  key={`${item.menu_id}-${index}`}
                >
                  <div>
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
                      item.subtotal
                    )}
                  </strong>
                </div>
              )
            )}
          </div>

          <div className="order-total">
            <span>
              Total
            </span>

            <strong>
              {formatPrice(
                order.total
              )}
            </strong>
          </div>
        </section>

        {/* NOTIFICATION */}
        {order.status !==
          "Selesai" &&
          order.status !==
            "Dibatalkan" && (
            <section className="order-notification-card">
              <div className="order-notification-icon">
                N
              </div>

              <div className="order-notification-text">
                <strong>
                  Dapatkan notifikasi
                </strong>

                <p>
                  Izinkan notifikasi agar
                  kamu tahu ketika pesanan
                  sudah siap diambil.
                </p>
              </div>

              {notificationPermission !==
                "granted" && (
                <button
                  type="button"
                  onClick={
                    requestNotificationPermission
                  }
                >
                  Aktifkan
                </button>
              )}

              {notificationPermission ===
                "granted" && (
                <span className="notification-active">
                  Aktif
                </span>
              )}
            </section>
          )}

        {/* AUTO UPDATE */}
        {order.status !==
          "Selesai" &&
          order.status !==
            "Dibatalkan" && (
            <div className="order-auto-update">
              <span className="order-live-dot" />

              Status diperbarui
              otomatis
            </div>
          )}

        {/* DASHBOARD */}
        <button
          type="button"
          className="order-dashboard-button"
          onClick={
            handleBackToDashboard
          }
        >
          Kembali ke dashboard
        </button>
      </main>
    </div>
  );
}

export default OrderSuccess;