import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit3,
  ImagePlus,
  Plus,
  RefreshCw,
  Save,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";

import "../styles/SellerMenu.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const SELLER_TOKEN_KEY = "canteenly_seller_token";
const SELLER_DATA_KEY = "canteenly_seller";

const INITIAL_FORM = {
  name: "",
  category: "Makanan",
  price: "",
  description: "",
  emoji: "🍽️",
  image: "",
  is_available: true,
};

const CATEGORIES = [
  "Makanan",
  "Minuman",
  "Snack",
];

export default function SellerMenu() {
  const navigate = useNavigate();

  const [menus, setMenus] = useState([]);
  const [seller, setSeller] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);

  const [form, setForm] = useState({
    ...INITIAL_FORM,
  });

  // =========================================================
  // AUTH
  // =========================================================

  const getToken = () => {
    return localStorage.getItem(SELLER_TOKEN_KEY);
  };

  const handleUnauthorized = () => {
    localStorage.removeItem(SELLER_TOKEN_KEY);
    localStorage.removeItem(SELLER_DATA_KEY);

    navigate("/seller/login", {
      replace: true,
    });
  };

  // =========================================================
  // LOAD SELLER
  // =========================================================

  const loadSellerFromStorage = () => {
    try {
      const storedSeller =
        localStorage.getItem(SELLER_DATA_KEY);

      if (!storedSeller) {
        return;
      }

      setSeller(JSON.parse(storedSeller));
    } catch (err) {
      console.error(
        "Seller storage error:",
        err
      );
    }
  };

  // =========================================================
  // LOAD MENU
  // =========================================================

  const loadMenus = async (showRefresh = false) => {
    const token = getToken();

    if (!token) {
      handleUnauthorized();
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
        `${API_URL}/api/sellers/menu`,
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
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Gagal mengambil data menu."
        );
      }

      setMenus(
        Array.isArray(data.menus)
          ? data.menus
          : []
      );
    } catch (err) {
      console.error(
        "Seller menu error:",
        err
      );

      setError(
        err.message ||
          "Gagal memuat menu."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSellerFromStorage();
    loadMenus();
  }, []);

  // =========================================================
  // NAVIGATION
  // =========================================================

  const handleBackToDashboard = () => {
    navigate("/seller/dashboard");
  };

  // =========================================================
  // FORM
  // =========================================================

  const resetForm = () => {
    setForm({
      ...INITIAL_FORM,
    });

    setEditingMenu(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setError("");
    setSuccess("");

    setEditingMenu(null);

    setForm({
      ...INITIAL_FORM,
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const openEditForm = (menu) => {
    setError("");
    setSuccess("");

    setEditingMenu(menu);

    setForm({
      name: menu.name || "",
      category: menu.category || "Makanan",
      price:
        menu.price !== undefined &&
        menu.price !== null
          ? String(menu.price)
          : "",
      description: menu.description || "",
      emoji: menu.emoji || "🍽️",
      image: menu.image || "",
      is_available:
        menu.is_available !== false,
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleFormChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  // =========================================================
  // IMAGE
  // =========================================================

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const image = new Image();

        image.onload = () => {
          const MAX_SIZE = 1000;

          let width = image.width;
          let height = image.height;

          if (
            width > MAX_SIZE ||
            height > MAX_SIZE
          ) {
            if (width > height) {
              height = Math.round(
                (height / width) *
                  MAX_SIZE
              );

              width = MAX_SIZE;
            } else {
              width = Math.round(
                (width / height) *
                  MAX_SIZE
              );

              height = MAX_SIZE;
            }
          }

          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width = width;
          canvas.height = height;

          const context =
            canvas.getContext("2d");

          if (!context) {
            reject(
              new Error(
                "Browser tidak mendukung pemrosesan gambar."
              )
            );
            return;
          }

          context.drawImage(
            image,
            0,
            0,
            width,
            height
          );

          const compressed =
            canvas.toDataURL(
              "image/jpeg",
              0.78
            );

          resolve(compressed);
        };

        image.onerror = () => {
          reject(
            new Error(
              "Gambar tidak dapat diproses."
            )
          );
        };

        image.src = event.target.result;
      };

      reader.onerror = () => {
        reject(
          new Error(
            "Gagal membaca gambar."
          )
        );
      };

      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (event) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setSuccess("");

    if (
      !file.type.startsWith("image/")
    ) {
      setError(
        "File yang dipilih harus berupa gambar."
      );

      event.target.value = "";
      return;
    }

    if (
      file.size >
      8 * 1024 * 1024
    ) {
      setError(
        "Ukuran gambar maksimal 8 MB."
      );

      event.target.value = "";
      return;
    }

    try {
      setSaving(true);

      const compressed =
        await compressImage(file);

      setForm((current) => ({
        ...current,
        image: compressed,
      }));
    } catch (err) {
      console.error(
        "Image error:",
        err
      );

      setError(
        err.message ||
          "Gagal memproses gambar."
      );
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  };

  const removeImage = () => {
    setForm((current) => ({
      ...current,
      image: "",
    }));
  };

  // =========================================================
  // CREATE / UPDATE
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    const name = form.name.trim();
    const priceText =
      String(form.price).trim();

    if (!name) {
      setError(
        "Nama menu wajib diisi."
      );
      return;
    }

    if (!priceText) {
      setError(
        "Harga menu wajib diisi."
      );
      return;
    }

    const numericPrice =
      Number(priceText);

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {
      setError(
        "Harga menu harus berupa angka yang valid."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const isEditing =
        Boolean(editingMenu);

      const url = isEditing
        ? `${API_URL}/api/sellers/menu/${editingMenu.id}`
        : `${API_URL}/api/sellers/menu`;

      const response = await fetch(url, {
        method: isEditing
          ? "PUT"
          : "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          name,
          category:
            form.category.trim(),
          price: numericPrice,
          description:
            form.description.trim(),
          emoji:
            form.emoji.trim() ||
            "🍽️",
          image:
            form.image || null,
          is_available:
            Boolean(form.is_available),
        }),
      });

      let data = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Gagal menyimpan menu."
        );
      }

      setSuccess(
        isEditing
          ? "Menu berhasil diperbarui."
          : "Menu berhasil ditambahkan."
      );

      resetForm();

      await loadMenus(true);
    } catch (err) {
      console.error(
        "Save menu error:",
        err
      );

      setError(
        err.message ||
          "Gagal menyimpan menu."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE
  // =========================================================

  const handleDelete = async (menu) => {
    const confirmed =
      window.confirm(
        `Hapus menu "${menu.name}"?\n\nMenu yang dihapus tidak dapat dikembalikan.`
      );

    if (!confirmed) {
      return;
    }

    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      setError("");
      setSuccess("");
      setSaving(true);

      const response =
        await fetch(
          `${API_URL}/api/sellers/menu/${menu.id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      let data = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Gagal menghapus menu."
        );
      }

      if (
        editingMenu?.id ===
        menu.id
      ) {
        resetForm();
      }

      setSuccess(
        "Menu berhasil dihapus."
      );

      await loadMenus(true);
    } catch (err) {
      console.error(
        "Delete menu error:",
        err
      );

      setError(
        err.message ||
          "Gagal menghapus menu."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // AVAILABILITY
  // =========================================================

  const toggleAvailability = async (
    menu
  ) => {
    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      setError("");
      setSuccess("");

      const newAvailability =
        !menu.is_available;

      const response =
        await fetch(
          `${API_URL}/api/sellers/menu/${menu.id}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",

              Authorization: `Bearer ${token}`,
            },

            body: JSON.stringify({
              is_available:
                newAvailability,
            }),
          }
        );

      let data = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Gagal mengubah status menu."
        );
      }

      setSuccess(
        newAvailability
          ? "Menu diaktifkan."
          : "Menu dinonaktifkan."
      );

      await loadMenus(true);
    } catch (err) {
      console.error(
        "Toggle menu error:",
        err
      );

      setError(
        err.message ||
          "Gagal mengubah status menu."
      );
    }
  };

  // =========================================================
  // FORMAT
  // =========================================================

  const formatPrice = (price) => {
    return new Intl.NumberFormat(
      "id-ID",
      {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }
    ).format(Number(price || 0));
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="seller-menu-page">
      <div className="seller-menu-shell">

        {/* HEADER */}
        <header className="seller-menu-header">

          <button
            type="button"
            className="seller-menu-back"
            onClick={
              handleBackToDashboard
            }
          >
            <ArrowLeft size={18} />
            <span>Dashboard</span>
          </button>

          <div className="seller-menu-brand">

            <div className="seller-menu-brand-icon">
              <ShoppingBag size={20} />
            </div>

            <div>
              <strong>
                Kelola Menu
              </strong>

              <span>
                {seller?.store_name ||
                  "Kantin"}
              </span>
            </div>

          </div>

          <div className="seller-menu-header-actions">

            <button
              type="button"
              className="seller-menu-refresh"
              onClick={() =>
                loadMenus(true)
              }
              disabled={
                refreshing ||
                loading ||
                saving
              }
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "seller-menu-spin"
                    : ""
                }
              />

              <span>
                {refreshing
                  ? "Memuat..."
                  : "Refresh"}
              </span>
            </button>

            <button
              type="button"
              className="seller-menu-add"
              onClick={
                openCreateForm
              }
              disabled={saving}
            >
              <Plus size={18} />
              <span>
                Tambah Menu
              </span>
            </button>

          </div>
        </header>

        <main className="seller-menu-main">

          {/* HEADING */}
          <section className="seller-menu-heading">

            <div>
              <span>
                MENU KANTIN
              </span>

              <h1>
                Kelola menu
              </h1>

              <p>
                Atur makanan, minuman,
                dan snack yang tersedia
                di kantinmu.
              </p>
            </div>

            <div className="seller-menu-count">
              <strong>
                {menus.length}
              </strong>

              <span>
                total menu
              </span>
            </div>

          </section>

          {/* MESSAGE */}
          {error && (
            <div className="seller-menu-message error">

              <span>{error}</span>

              <button
                type="button"
                onClick={() =>
                  setError("")
                }
                aria-label="Tutup pesan error"
              >
                <X size={16} />
              </button>

            </div>
          )}

          {success && (
            <div className="seller-menu-message success">

              <span>{success}</span>

              <button
                type="button"
                onClick={() =>
                  setSuccess("")
                }
                aria-label="Tutup pesan sukses"
              >
                <X size={16} />
              </button>

            </div>
          )}

          {/* FORM */}
          {showForm && (
            <section className="seller-menu-form-card">

              <div className="seller-menu-form-header">

                <div>
                  <span>
                    {editingMenu
                      ? "EDIT MENU"
                      : "MENU BARU"}
                  </span>

                  <h2>
                    {editingMenu
                      ? "Edit menu"
                      : "Tambah menu"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={
                    resetForm
                  }
                  disabled={saving}
                  aria-label="Tutup form"
                >
                  <X size={20} />
                </button>

              </div>

              <form
                onSubmit={
                  handleSubmit
                }
              >

                {/* IMAGE */}
                <div className="seller-menu-image-upload">

                  <div className="seller-menu-image-preview">

                    {form.image ? (
                      <img
                        src={form.image}
                        alt={
                          form.name ||
                          "Preview menu"
                        }
                      />
                    ) : (
                      <div className="seller-menu-image-placeholder">

                        <ImagePlus
                          size={28}
                        />

                        <span>
                          Thumbnail menu
                        </span>

                      </div>
                    )}

                  </div>

                  <div className="seller-menu-image-info">

                    <strong>
                      Foto menu
                    </strong>

                    <span>
                      Gunakan foto yang
                      jelas. JPG, PNG,
                      atau WEBP maksimal
                      8 MB.
                    </span>

                    <div className="seller-menu-image-buttons">

                      <label className="seller-menu-upload-button">

                        <ImagePlus
                          size={15}
                        />

                        {form.image
                          ? "Ganti gambar"
                          : "Pilih gambar"}

                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={
                            handleImageChange
                          }
                          disabled={
                            saving
                          }
                          hidden
                        />

                      </label>

                      {form.image && (
                        <button
                          type="button"
                          className="seller-menu-remove-image"
                          onClick={
                            removeImage
                          }
                          disabled={
                            saving
                          }
                        >
                          <X size={14} />
                          Hapus
                        </button>
                      )}

                    </div>
                  </div>

                </div>

                {/* FORM GRID */}
                <div className="seller-menu-form-grid">

                  <div className="seller-menu-field">

                    <label htmlFor="menu-name">
                      Nama menu
                    </label>

                    <input
                      id="menu-name"
                      name="name"
                      value={
                        form.name
                      }
                      onChange={
                        handleFormChange
                      }
                      placeholder="Contoh: Nasi Goreng"
                      autoComplete="off"
                      disabled={
                        saving
                      }
                    />

                  </div>

                  <div className="seller-menu-field">

                    <label htmlFor="menu-category">
                      Kategori
                    </label>

                    <select
                      id="menu-category"
                      name="category"
                      value={
                        form.category
                      }
                      onChange={
                        handleFormChange
                      }
                      disabled={
                        saving
                      }
                    >
                      {CATEGORIES.map(
                        (category) => (
                          <option
                            key={
                              category
                            }
                            value={
                              category
                            }
                          >
                            {category}
                          </option>
                        )
                      )}
                    </select>

                  </div>

                  <div className="seller-menu-field">

                    <label htmlFor="menu-price">
                      Harga
                    </label>

                    <input
                      id="menu-price"
                      name="price"
                      type="number"
                      min="0"
                      step="500"
                      value={
                        form.price
                      }
                      onChange={
                        handleFormChange
                      }
                      placeholder="12000"
                      inputMode="numeric"
                      disabled={
                        saving
                      }
                    />

                  </div>

                  <div className="seller-menu-field">

                    <label htmlFor="menu-emoji">
                      Emoji
                    </label>

                    <input
                      id="menu-emoji"
                      name="emoji"
                      value={
                        form.emoji
                      }
                      onChange={
                        handleFormChange
                      }
                      placeholder="🍳"
                      maxLength={8}
                      disabled={
                        saving
                      }
                    />

                  </div>

                  <div className="seller-menu-field full">

                    <label htmlFor="menu-description">
                      Deskripsi
                    </label>

                    <textarea
                      id="menu-description"
                      name="description"
                      value={
                        form.description
                      }
                      onChange={
                        handleFormChange
                      }
                      placeholder="Contoh: Nasi goreng dengan telur dan ayam."
                      rows={3}
                      maxLength={300}
                      disabled={
                        saving
                      }
                    />

                    <small>
                      {form.description.length}
                      /300
                    </small>

                  </div>

                  <label className="seller-menu-checkbox">

                    <input
                      name="is_available"
                      type="checkbox"
                      checked={
                        form.is_available
                      }
                      onChange={
                        handleFormChange
                      }
                      disabled={
                        saving
                      }
                    />

                    <span>
                      Menu tersedia
                    </span>

                  </label>

                </div>

                {/* ACTIONS */}
                <div className="seller-menu-form-actions">

                  <button
                    type="button"
                    onClick={
                      resetForm
                    }
                    disabled={saving}
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                  >
                    <Save size={17} />

                    {saving
                      ? "Menyimpan..."
                      : editingMenu
                      ? "Simpan Perubahan"
                      : "Tambah Menu"}
                  </button>

                </div>

              </form>

            </section>
          )}

          {/* CONTENT */}
          {loading ? (
            <div className="seller-menu-loading">

              <div className="seller-menu-loading-spinner" />

              <strong>
                Memuat menu...
              </strong>

              <span>
                Mengambil data dari
                database.
              </span>

            </div>
          ) : menus.length === 0 ? (
            <div className="seller-menu-empty">

              <div className="seller-menu-empty-icon">
                <ShoppingBag size={28} />
              </div>

              <h2>
                Belum ada menu
              </h2>

              <p>
                Tambahkan menu pertama
                untuk mulai berjualan.
              </p>

              <button
                type="button"
                onClick={
                  openCreateForm
                }
              >
                <Plus size={18} />
                Tambah Menu
              </button>

            </div>
          ) : (
            <section className="seller-menu-grid">

              {menus.map((menu) => (
                <article
                  className={`seller-menu-card ${
                    !menu.is_available
                      ? "unavailable"
                      : ""
                  }`}
                  key={menu.id}
                >

                  {/* IMAGE */}
                  <div className="seller-menu-card-image">

                    {menu.image ? (
                      <img
                        src={menu.image}
                        alt={menu.name}
                      />
                    ) : (
                      <div className="seller-menu-card-no-image">
                        <span>
                          {menu.emoji ||
                            "🍽️"}
                        </span>
                      </div>
                    )}

                    <span className="seller-menu-card-category">
                      {menu.category}
                    </span>

                    {!menu.is_available && (
                      <div className="seller-menu-unavailable-overlay">
                        Tidak tersedia
                      </div>
                    )}

                  </div>

                  {/* CONTENT */}
                  <div className="seller-menu-card-content">

                    <div className="seller-menu-card-title-row">

                      <h2>
                        {menu.name}
                      </h2>

                      <strong>
                        {formatPrice(
                          menu.price
                        )}
                      </strong>

                    </div>

                    <p>
                      {menu.description ||
                        "Tidak ada deskripsi."}
                    </p>

                  </div>

                  {/* FOOTER */}
                  <div className="seller-menu-card-footer">

                    <button
                      type="button"
                      className={`seller-menu-availability ${
                        menu.is_available
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        toggleAvailability(
                          menu
                        )
                      }
                      disabled={saving}
                    >
                      <span />

                      {menu.is_available
                        ? "Tersedia"
                        : "Tidak tersedia"}
                    </button>

                    <div className="seller-menu-card-actions">

                      <button
                        type="button"
                        onClick={() =>
                          openEditForm(
                            menu
                          )
                        }
                        aria-label={`Edit ${menu.name}`}
                        disabled={saving}
                      >
                        <Edit3 size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            menu
                          )
                        }
                        aria-label={`Hapus ${menu.name}`}
                        disabled={saving}
                      >
                        <Trash2 size={16} />
                      </button>

                    </div>

                  </div>

                </article>
              ))}

            </section>
          )}

        </main>
      </div>
    </div>
  );
}