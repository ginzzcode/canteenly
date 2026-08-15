import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Package,
  Search,
  ShoppingBag,
  Utensils,
  X,
} from "lucide-react";
import "../styles/SellerOrders.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const filters = [
  "Semua",
  "Menunggu",
  "Diproses",
  "Siap diambil",
  "Selesai",
  "Dibatalkan",
];

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price || 0);
}

function getOrderTotal(order) {
  if (typeof order.total === "number") {
    return order.total;
  }

  return (order.items || []).reduce(
    (total, item) =>
      total +
      (Number(item.price) || 0) *
        (Number(item.quantity) || 0),
    0
  );
}

function getNextStatus(status) {
  if (status === "Menunggu") {
    return "Diproses";
  }

  if (status === "Diproses") {
    return "Siap diambil";
  }

  if (status === "Siap diambil") {
    return "Selesai";
  }

  return "Selesai";
}

function getStatusClass(status) {
  switch (status) {
    case "Menunggu":
      return "seller-order-status-pending";

    case "Diproses":
      return "seller-order-status-process";

    case "Siap diambil":
      return "seller-order-status-ready";

    case "Selesai":
      return "seller-order-status-complete";

    case "Dibatalkan":
      return "seller-order-status-cancelled";

    default:
      return "";
  }
}

function formatOrderTime(time) {
  if (!time || time === "-") {
    return "-";
  }

  return time;
}

function SellerOrders({ seller }) {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [activeFilter, setActiveFilter] =
    useState("Semua");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] =
    useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] =
    useState(null);

  const sellerName =
    seller?.name || "Penjual";

  const sellerStore =
    seller?.storeName ||
    seller?.store_name ||
    "Kantin Sekolah";

  // =====================================================
  // TOKEN
  // =====================================================

  const getToken = () => {
    return localStorage.getItem(
      "canteenly_seller_token"
    );
  };

  // =====================================================
  // BACK TO DASHBOARD
  // =====================================================

  const handleBackToDashboard = () => {
    navigate("/seller/dashboard");
  };

  // =====================================================
  // FETCH ORDERS
  // =====================================================

  const fetchOrders = async () => {
    const token = getToken();

    if (!token) {
      setError(
        "Sesi login tidak ditemukan. Silakan login kembali."
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/sellers/orders`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Gagal mengambil data pesanan."
        );
      }

      setOrders(data.orders || []);
    } catch (err) {
      console.error(
        "Gagal mengambil orders:",
        err
      );

      setError(
        err.message ||
          "Terjadi kesalahan saat mengambil pesanan."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    fetchOrders();
  }, []);

  // =====================================================
  // UPDATE STATUS
  // =====================================================

  const updateOrderStatus = async (
    orderId,
    newStatus
  ) => {
    const token = getToken();

    if (!token) {
      setError(
        "Sesi login tidak ditemukan. Silakan login kembali."
      );
      return false;
    }

    try {
      setUpdatingOrderId(orderId);
      setError("");

      const response = await fetch(
        `${API_URL}/api/sellers/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Gagal memperbarui status pesanan."
        );
      }

      const updatedOrder = data.order;

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId
            ? updatedOrder
            : order
        )
      );

      setSelectedOrder((currentOrder) =>
        currentOrder?.id === orderId
          ? updatedOrder
          : currentOrder
      );

      return true;
    } catch (err) {
      console.error(
        "Gagal update status:",
        err
      );

      setError(
        err.message ||
          "Gagal memperbarui status pesanan."
      );

      return false;
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // =====================================================
  // NEXT STATUS
  // =====================================================

  const handleNextStatus = async (order) => {
    if (updatingOrderId === order.id) {
      return;
    }

    const nextStatus = getNextStatus(
      order.status
    );

    await updateOrderStatus(
      order.id,
      nextStatus
    );
  };

  // =====================================================
  // FILTER
  // =====================================================

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const filterMatch =
        activeFilter === "Semua" ||
        order.status === activeFilter;

      const searchText = `
        ${order.code || ""}
        ${order.customer || ""}
        ${order.className || ""}
      `.toLowerCase();

      const searchMatch =
        searchText.includes(
          search.toLowerCase()
        );

      return filterMatch && searchMatch;
    });
  }, [
    orders,
    activeFilter,
    search,
  ]);

  // =====================================================
  // STATISTICS
  // =====================================================

  const pendingCount = orders.filter(
    (order) =>
      order.status === "Menunggu"
  ).length;

  const processCount = orders.filter(
    (order) =>
      order.status === "Diproses"
  ).length;

  const readyCount = orders.filter(
    (order) =>
      order.status === "Siap diambil"
  ).length;

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="seller-orders-page">
      {/* NAVBAR */}

      <header className="seller-navbar">
        <div className="seller-nav-inner">
          <div className="seller-brand">
            <div className="seller-brand-icon">
              <ShoppingBag
                size={20}
                strokeWidth={2.4}
              />
            </div>

            <div>
              <strong>Canteenly</strong>
              <span>Pesanan Seller</span>
            </div>
          </div>

          <div className="seller-account">
            <div className="seller-avatar">
              {sellerName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="seller-account-info">
              <strong>{sellerName}</strong>
              <span>{sellerStore}</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}

      <main className="seller-orders-main">
        <button
          type="button"
          className="seller-menu-back"
          onClick={handleBackToDashboard}
        >
          <ArrowLeft size={17} />
          Kembali ke Dashboard
        </button>

        {/* HEADING */}

        <section className="seller-orders-heading">
          <div>
            <span className="seller-eyebrow">
              PESANAN MASUK
            </span>

            <h1>Kelola Pesanan</h1>

            <p>
              Proses pesanan siswa sampai
              selesai diambil.
            </p>
          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div className="seller-orders-error">
            <span>{error}</span>

            <button
              type="button"
              onClick={fetchOrders}
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* STATS */}

        <section className="seller-order-stats">
          <div className="seller-order-mini-stat">
            <div className="seller-order-mini-icon pending">
              <Clock3 size={18} />
            </div>

            <div>
              <span>Menunggu</span>

              <strong>
                {pendingCount}
              </strong>
            </div>
          </div>

          <div className="seller-order-mini-stat">
            <div className="seller-order-mini-icon process">
              <Utensils size={18} />
            </div>

            <div>
              <span>Diproses</span>

              <strong>
                {processCount}
              </strong>
            </div>
          </div>

          <div className="seller-order-mini-stat">
            <div className="seller-order-mini-icon ready">
              <Package size={18} />
            </div>

            <div>
              <span>Siap diambil</span>

              <strong>
                {readyCount}
              </strong>
            </div>
          </div>

          <div className="seller-order-mini-stat">
            <div className="seller-order-mini-icon total">
              <ShoppingBag size={18} />
            </div>

            <div>
              <span>Total pesanan</span>

              <strong>
                {orders.length}
              </strong>
            </div>
          </div>
        </section>

        {/* TOOLBAR */}

        <section className="seller-orders-toolbar">
          <div className="seller-order-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Cari kode atau nama siswa..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="seller-order-filters">
            {filters.map((filter) => (
              <button
                type="button"
                key={filter}
                className={
                  activeFilter === filter
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveFilter(filter)
                }
              >
                {filter}
              </button>
            ))}
          </div>
        </section>

        {/* ORDERS */}

        <section className="seller-orders-list">
          {loading ? (
            <div className="seller-orders-loading">
              <div className="seller-orders-spinner" />

              <span>
                Memuat pesanan...
              </span>
            </div>
          ) : filteredOrders.length > 0 ? (
            filteredOrders.map(
              (order) => (
                <article
                  className="seller-order-card"
                  key={order.id}
                >
                  {/* HEADER */}

                  <div className="seller-order-card-header">
                    <div className="seller-order-main-info">
                      <div className="seller-order-large-icon">
                        <ShoppingBag
                          size={20}
                        />
                      </div>

                      <div>
                        <strong>
                          {order.code}
                        </strong>

                        <span>
                          Dipesan pukul{" "}
                          {formatOrderTime(
                            order.time
                          )}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`seller-order-status ${getStatusClass(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* CONTENT */}

                  <div className="seller-order-card-content">
                    <div className="seller-order-customer-info">
                      <span>
                        Pemesan
                      </span>

                      <strong>
                        {order.customer ||
                          "Siswa"}
                      </strong>

                      <small>
                        Kelas{" "}
                        {order.className ||
                          "-"}
                      </small>
                    </div>

                    <div className="seller-order-items">
                      <span>
                        Pesanan
                      </span>

                      {(order.items || []).map(
                        (
                          item,
                          index
                        ) => (
                          <div
                            className="seller-order-item"
                            key={`${order.id}-${index}`}
                          >
                            <span>
                              {item.name}
                            </span>

                            <strong>
                              {
                                item.quantity
                              }
                              ×
                            </strong>
                          </div>
                        )
                      )}
                    </div>

                    <div className="seller-order-total-box">
                      <span>
                        Total
                      </span>

                      <strong>
                        {formatPrice(
                          getOrderTotal(
                            order
                          )
                        )}
                      </strong>
                    </div>
                  </div>

                  {/* FOOTER */}

                  <div className="seller-order-card-footer">
                    <button
                      type="button"
                      className="seller-detail-button"
                      onClick={() =>
                        setSelectedOrder(
                          order
                        )
                      }
                    >
                      Lihat Detail

                      <ArrowRight
                        size={15}
                      />
                    </button>

                    {order.status !==
                      "Selesai" &&
                      order.status !==
                        "Dibatalkan" && (
                        <button
                          type="button"
                          className="seller-next-status-button"
                          disabled={
                            updatingOrderId ===
                            order.id
                          }
                          onClick={() =>
                            handleNextStatus(
                              order
                            )
                          }
                        >
                          {updatingOrderId ===
                          order.id
                            ? "Memperbarui..."
                            : order.status ===
                              "Menunggu"
                            ? "Mulai Proses"
                            : order.status ===
                              "Diproses"
                            ? "Tandai Siap"
                            : "Selesaikan Pesanan"}

                          {updatingOrderId !==
                            order.id && (
                            <ArrowRight
                              size={16}
                            />
                          )}
                        </button>
                      )}

                    {order.status ===
                      "Selesai" && (
                      <div className="seller-completed-label">
                        <CheckCircle2
                          size={16}
                        />

                        Pesanan selesai
                      </div>
                    )}

                    {order.status ===
                      "Dibatalkan" && (
                      <div className="seller-completed-label">
                        <X size={16} />

                        Pesanan dibatalkan
                      </div>
                    )}
                  </div>
                </article>
              )
            )
          ) : (
            <div className="seller-orders-empty">
              <div>
                <ClipboardListIcon />
              </div>

              <h2>
                Tidak ada pesanan
              </h2>

              <p>
                Belum ada pesanan yang
                sesuai dengan filter.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* DETAIL MODAL */}

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          updating={
            updatingOrderId ===
            selectedOrder.id
          }
          onClose={() =>
            setSelectedOrder(null)
          }
          onUpdateStatus={
            updateOrderStatus
          }
        />
      )}
    </div>
  );
}

function ClipboardListIcon() {
  return <Package size={27} />;
}

function OrderDetailModal({
  order,
  onClose,
  onUpdateStatus,
  updating,
}) {
  const total = getOrderTotal(order);

  const handleUpdate = async () => {
    const nextStatus =
      getNextStatus(order.status);

    await onUpdateStatus(
      order.id,
      nextStatus
    );
  };

  return (
    <div
      className="seller-order-modal-overlay"
      onClick={onClose}
    >
      <div
        className="seller-order-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        {/* HEADER */}

        <div className="seller-order-modal-header">
          <div>
            <span className="seller-eyebrow">
              DETAIL PESANAN
            </span>

            <h2>{order.code}</h2>

            <p>
              Dipesan pukul{" "}
              {formatOrderTime(
                order.time
              )}
            </p>
          </div>

          <button
            type="button"
            className="seller-form-close"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* CUSTOMER */}

        <div className="seller-detail-customer">
          <div className="seller-avatar large">
            {(order.customer ||
              "S")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <span>Pemesan</span>

            <strong>
              {order.customer ||
                "Siswa"}
            </strong>

            <small>
              Kelas{" "}
              {order.className ||
                "-"}
            </small>
          </div>
        </div>

        {/* ITEMS */}

        <div className="seller-detail-items">
          <h3>Isi Pesanan</h3>

          {(order.items || []).map(
            (item, index) => (
              <div
                className="seller-detail-item"
                key={index}
              >
                <div>
                  <strong>
                    {item.name}
                  </strong>

                  <span>
                    {item.quantity} ×{" "}
                    {formatPrice(
                      item.price
                    )}
                  </span>
                </div>

                <strong>
                  {formatPrice(
                    item.subtotal ??
                      item.price *
                        item.quantity
                  )}
                </strong>
              </div>
            )
          )}
        </div>

        {/* TOTAL */}

        <div className="seller-detail-total">
          <span>
            Total pembayaran
          </span>

          <strong>
            {formatPrice(total)}
          </strong>
        </div>

        {/* STATUS */}

        <div className="seller-detail-status">
          <span>
            Status sekarang
          </span>

          <strong
            className={`seller-order-status ${getStatusClass(
              order.status
            )}`}
          >
            {order.status}
          </strong>
        </div>

        {/* NEXT STATUS */}

        {order.status !==
          "Selesai" &&
          order.status !==
            "Dibatalkan" && (
            <button
              type="button"
              className="seller-next-status-button full"
              disabled={updating}
              onClick={handleUpdate}
            >
              {updating
                ? "Memperbarui..."
                : order.status ===
                  "Menunggu"
                ? "Mulai Proses Pesanan"
                : order.status ===
                  "Diproses"
                ? "Tandai Siap Diambil"
                : "Selesaikan Pesanan"}

              {!updating && (
                <ArrowRight
                  size={17}
                />
              )}
            </button>
          )}

        {order.status ===
          "Selesai" && (
          <div className="seller-detail-complete">
            <Check size={17} />

            Pesanan ini sudah
            selesai.
          </div>
        )}

        {order.status ===
          "Dibatalkan" && (
          <div className="seller-detail-complete">
            <X size={17} />

            Pesanan ini
            dibatalkan.
          </div>
        )}
      </div>
    </div>
  );
}

export default SellerOrders;