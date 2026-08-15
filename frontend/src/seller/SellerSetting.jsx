import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  User,
  Store,
  Lock,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Camera,
  Image as ImageIcon,
  Upload,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/SellerSetting.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";

const SELLER_TOKEN_KEY =
  "canteenly_seller_token";

const SELLER_DATA_KEY =
  "canteenly_seller";

const MAX_PROFILE_SIZE = 400;
const MAX_BANNER_SIZE = 1200;

function compressImage(
  file,
  maxWidth,
  maxHeight,
  quality = 0.82
) {
  return new Promise(
    (resolve, reject) => {
      if (!file) {
        reject(
          new Error(
            "File gambar tidak ditemukan."
          )
        );

        return;
      }

      if (
        !file.type.startsWith(
          "image/"
        )
      ) {
        reject(
          new Error(
            "File yang dipilih harus berupa gambar."
          )
        );

        return;
      }

      const reader =
        new FileReader();

      reader.onload = () => {
        const image =
          new Image();

        image.onload = () => {
          let width =
            image.width;

          let height =
            image.height;

          const ratio = Math.min(
            maxWidth / width,
            maxHeight / height,
            1
          );

          width = Math.round(
            width * ratio
          );

          height = Math.round(
            height * ratio
          );

          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width = width;
          canvas.height = height;

          const context =
            canvas.getContext(
              "2d"
            );

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

          const result =
            canvas.toDataURL(
              "image/jpeg",
              quality
            );

          resolve(result);
        };

        image.onerror = () => {
          reject(
            new Error(
              "Gambar tidak dapat diproses."
            )
          );
        };

        image.src =
          reader.result;
      };

      reader.onerror = () => {
        reject(
          new Error(
            "Gagal membaca gambar."
          )
        );
      };

      reader.readAsDataURL(file);
    }
  );
}

function SellerSetting() {
  const navigate = useNavigate();

  const profileInputRef =
    useRef(null);

  const bannerInputRef =
    useRef(null);

  const [seller, setSeller] =
    useState(null);

  const [sellerName, setSellerName] =
    useState("");

  const [storeName, setStoreName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [
    storeDescription,
    setStoreDescription,
  ] = useState("");

  const [profileImage, setProfileImage] =
    useState("");

  const [bannerImage, setBannerImage] =
    useState("");

  const [storeOpen, setStoreOpen] =
    useState(true);

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] = useState(false);

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    profileMessage,
    setProfileMessage,
  ] = useState("");

  const [
    profileMessageType,
    setProfileMessageType,
  ] = useState("");

  const [
    passwordMessage,
    setPasswordMessage,
  ] = useState("");

  const [
    passwordMessageType,
    setPasswordMessageType,
  ] = useState("");

  const [
    savingProfile,
    setSavingProfile,
  ] = useState(false);

  const [
    changingPassword,
    setChangingPassword,
  ] = useState(false);

  const [
    profileImageLoading,
    setProfileImageLoading,
  ] = useState(false);

  const [
    bannerImageLoading,
    setBannerImageLoading,
  ] = useState(false);

  useEffect(() => {
    loadSellerData();
  }, []);

  function loadSellerData() {
    try {
      const savedSeller =
        localStorage.getItem(
          SELLER_DATA_KEY
        );

      if (!savedSeller) {
        return;
      }

      const data =
        JSON.parse(savedSeller);

      setSeller(data);

      setSellerName(
        data.name || ""
      );

      setStoreName(
        data.storeName ||
          data.store_name ||
          ""
      );

      setEmail(
        data.email || ""
      );

      setStoreDescription(
        data.storeDescription ||
          data.store_description ||
          ""
      );

      setProfileImage(
        data.profile_image ||
          data.profileImage ||
          ""
      );

      setBannerImage(
        data.banner_image ||
          data.bannerImage ||
          ""
      );

      if (
        typeof data.storeOpen ===
        "boolean"
      ) {
        setStoreOpen(
          data.storeOpen
        );
      }
    } catch (error) {
      console.error(
        "Gagal membaca data seller:",
        error
      );
    }
  }

  function handleBack() {
    navigate(
      "/seller/dashboard"
    );
  }

  function logoutSeller() {
    localStorage.removeItem(
      SELLER_TOKEN_KEY
    );

    localStorage.removeItem(
      SELLER_DATA_KEY
    );

    navigate(
      "/seller/login",
      {
        replace: true,
      }
    );
  }

  async function handleProfileImageChange(
    event
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      setProfileImageLoading(
        true
      );

      const compressed =
        await compressImage(
          file,
          MAX_PROFILE_SIZE,
          MAX_PROFILE_SIZE,
          0.84
        );

      setProfileImage(
        compressed
      );

      setProfileMessage(
        ""
      );
    } catch (error) {
      console.error(
        "Profile image error:",
        error
      );

      setProfileMessage(
        error.message ||
          "Gagal memproses foto profil."
      );

      setProfileMessageType(
        "error"
      );
    } finally {
      setProfileImageLoading(
        false
      );
    }
  }

  async function handleBannerImageChange(
    event
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      setBannerImageLoading(
        true
      );

      const compressed =
        await compressImage(
          file,
          MAX_BANNER_SIZE,
          700,
          0.82
        );

      setBannerImage(
        compressed
      );

      setProfileMessage(
        ""
      );
    } catch (error) {
      console.error(
        "Banner image error:",
        error
      );

      setProfileMessage(
        error.message ||
          "Gagal memproses banner."
      );

      setProfileMessageType(
        "error"
      );
    } finally {
      setBannerImageLoading(
        false
      );
    }
  }

  function removeProfileImage() {
    setProfileImage("");
  }

  function removeBannerImage() {
    setBannerImage("");
  }

  async function handleProfileSubmit(
    event
  ) {
    event.preventDefault();

    setProfileMessage("");
    setProfileMessageType("");

    const trimmedSellerName =
      sellerName.trim();

    const trimmedStoreName =
      storeName.trim();

    const trimmedEmail =
      email.trim();

    const trimmedDescription =
      storeDescription.trim();

    if (
      trimmedSellerName.length <
      2
    ) {
      setProfileMessage(
        "Nama seller minimal 2 karakter."
      );

      setProfileMessageType(
        "error"
      );

      return;
    }

    if (
      trimmedStoreName.length <
      2
    ) {
      setProfileMessage(
        "Nama kantin minimal 2 karakter."
      );

      setProfileMessageType(
        "error"
      );

      return;
    }

    if (!trimmedEmail) {
      setProfileMessage(
        "Email wajib diisi."
      );

      setProfileMessageType(
        "error"
      );

      return;
    }

    const token =
      localStorage.getItem(
        SELLER_TOKEN_KEY
      );

    if (!token) {
      logoutSeller();
      return;
    }

    try {
      setSavingProfile(true);

      const response =
        await fetch(
          `${API_URL}/api/sellers/profile`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              name:
                trimmedSellerName,

              store_name:
                trimmedStoreName,

              email:
                trimmedEmail,

              store_description:
                trimmedDescription,

              store_open:
                storeOpen,

              profile_image:
                profileImage || null,

              banner_image:
                bannerImage || null,
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

      if (
        response.status ===
        401
      ) {
        logoutSeller();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Gagal menyimpan pengaturan profil."
        );
      }

      const updatedSeller =
        data.seller || {
          ...(seller || {}),

          id:
            seller?.id,

          name:
            trimmedSellerName,

          store_name:
            trimmedStoreName,

          storeName:
            trimmedStoreName,

          email:
            trimmedEmail,

          store_description:
            trimmedDescription,

          storeDescription:
            trimmedDescription,

          store_open:
            storeOpen,

          storeOpen,

          profile_image:
            profileImage || null,

          banner_image:
            bannerImage || null,
        };

      setSeller(
        updatedSeller
      );

      setSellerName(
        updatedSeller.name ||
          ""
      );

      setStoreName(
        updatedSeller.store_name ||
          updatedSeller.storeName ||
          ""
      );

      setEmail(
        updatedSeller.email ||
          ""
      );

      setStoreDescription(
        updatedSeller.store_description ||
          updatedSeller.storeDescription ||
          ""
      );

      setProfileImage(
        updatedSeller.profile_image ||
          ""
      );

      setBannerImage(
        updatedSeller.banner_image ||
          ""
      );

      if (
        typeof updatedSeller.store_open ===
        "boolean"
      ) {
        setStoreOpen(
          updatedSeller.store_open
        );
      }

      localStorage.setItem(
        SELLER_DATA_KEY,
        JSON.stringify(
          updatedSeller
        )
      );

      setProfileMessage(
        data.message ||
          "Pengaturan profil berhasil disimpan."
      );

      setProfileMessageType(
        "success"
      );
    } catch (error) {
      console.error(
        "Update seller profile error:",
        error
      );

      setProfileMessage(
        error.message ||
          "Gagal menyimpan pengaturan profil."
      );

      setProfileMessageType(
        "error"
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(
    event
  ) {
    event.preventDefault();

    setPasswordMessage("");
    setPasswordMessageType("");

    if (!currentPassword) {
      setPasswordMessage(
        "Password saat ini wajib diisi."
      );

      setPasswordMessageType(
        "error"
      );

      return;
    }

    if (!newPassword) {
      setPasswordMessage(
        "Password baru wajib diisi."
      );

      setPasswordMessageType(
        "error"
      );

      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage(
        "Password baru minimal 6 karakter."
      );

      setPasswordMessageType(
        "error"
      );

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setPasswordMessage(
        "Konfirmasi password tidak sesuai."
      );

      setPasswordMessageType(
        "error"
      );

      return;
    }

    if (
      currentPassword ===
      newPassword
    ) {
      setPasswordMessage(
        "Password baru harus berbeda dari password lama."
      );

      setPasswordMessageType(
        "error"
      );

      return;
    }

    const token =
      localStorage.getItem(
        SELLER_TOKEN_KEY
      );

    if (!token) {
      setPasswordMessage(
        "Sesi login tidak ditemukan. Silakan login kembali."
      );

      setPasswordMessageType(
        "error"
      );

      return;
    }

    try {
      setChangingPassword(
        true
      );

      const response =
        await fetch(
          `${API_URL}/api/sellers/password`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              current_password:
                currentPassword,

              new_password:
                newPassword,
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

      if (
        response.status ===
        401
      ) {
        logoutSeller();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Gagal mengganti password."
        );
      }

      setPasswordMessage(
        data.message ||
          "Password berhasil diperbarui."
      );

      setPasswordMessageType(
        "success"
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(
        "Change password error:",
        error
      );

      setPasswordMessage(
        error.message ||
          "Gagal mengganti password."
      );

      setPasswordMessageType(
        "error"
      );
    } finally {
      setChangingPassword(
        false
      );
    }
  }

  return (
    <div className="seller-setting-page">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="seller-setting-header">
        <div className="seller-setting-header-inner">
          <button
            type="button"
            className="seller-setting-back"
            onClick={handleBack}
          >
            <ArrowLeft size={17} />

            Kembali ke Dashboard
          </button>

          <div className="seller-setting-brand">
            <div className="seller-setting-brand-icon">
              <Store
                size={20}
                strokeWidth={2.4}
              />
            </div>

            <div>
              <strong>
                Canteenly
              </strong>

              <span>
                Pengaturan Seller
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className="seller-setting-main">
        <section className="seller-setting-heading">
          <span className="seller-setting-eyebrow">
            PENGATURAN
          </span>

          <h1>
            Pengaturan Kantin
          </h1>

          <p>
            Kelola informasi akun dan
            tampilan kantin kamu.
          </p>
        </section>

        {/* ===================================================
            PROFILE CARD
        ==================================================== */}

        <section className="seller-setting-card">
          <div className="seller-setting-card-heading">
            <div className="seller-setting-section-icon">
              <User size={19} />
            </div>

            <div>
              <span>
                AKUN
              </span>

              <h2>
                Profil Seller
              </h2>

              <p>
                Informasi dasar akun dan
                tampilan kantin.
              </p>
            </div>
          </div>

          <form
            className="seller-setting-form"
            onSubmit={
              handleProfileSubmit
            }
          >
            {/* ===============================================
                STORE VISUAL
            ================================================ */}

            <div className="seller-setting-divider" />

            <div className="seller-setting-subheading">
              <ImageIcon size={17} />

              <div>
                <strong>
                  Tampilan Kantin
                </strong>

                <span>
                  Gambar ini akan ditampilkan
                  kepada pembeli.
                </span>
              </div>
            </div>

            {/* BANNER */}

            <div className="seller-setting-image-field">
              <label>
                Banner kantin
              </label>

              <div
                className={`seller-setting-banner-preview ${
                  bannerImage
                    ? "has-image"
                    : ""
                }`}
              >
                {bannerImage ? (
                  <img
                    src={
                      bannerImage
                    }
                    alt="Banner kantin"
                  />
                ) : (
                  <div className="seller-setting-banner-empty">
                    <ImageIcon
                      size={30}
                    />

                    <strong>
                      Belum ada banner
                    </strong>

                    <span>
                      Tambahkan gambar
                      untuk membuat
                      kantin lebih menarik.
                    </span>
                  </div>
                )}

                {bannerImage && (
                  <button
                    type="button"
                    className="seller-setting-image-remove"
                    onClick={
                      removeBannerImage
                    }
                    aria-label="Hapus banner"
                  >
                    <Trash2
                      size={16}
                    />
                  </button>
                )}

                <button
                  type="button"
                  className="seller-setting-image-upload"
                  onClick={() =>
                    bannerInputRef.current?.click()
                  }
                  disabled={
                    bannerImageLoading
                  }
                >
                  {bannerImageLoading ? (
                    "Memproses..."
                  ) : (
                    <>
                      <Upload
                        size={16}
                      />

                      {bannerImage
                        ? "Ganti Banner"
                        : "Pilih Banner"}
                    </>
                  )}
                </button>
              </div>

              <input
                ref={
                  bannerInputRef
                }
                type="file"
                accept="image/*"
                hidden
                onChange={
                  handleBannerImageChange
                }
              />

              <small>
                Gunakan gambar horizontal.
                Gambar akan dikompres
                otomatis sebelum disimpan.
              </small>
            </div>

            {/* PROFILE IMAGE */}

            <div className="seller-setting-image-field">
              <label>
                Foto profil toko
              </label>

              <div className="seller-setting-profile-upload">
                <div className="seller-setting-profile-preview">
                  {profileImage ? (
                    <img
                      src={
                        profileImage
                      }
                      alt="Profil toko"
                    />
                  ) : (
                    <span>
                      {(
                        storeName ||
                        "K"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}

                  <div className="seller-setting-profile-camera">
                    <Camera
                      size={15}
                    />
                  </div>
                </div>

                <div className="seller-setting-profile-actions">
                  <strong>
                    Foto profil kantin
                  </strong>

                  <span>
                    Tampilkan logo atau
                    foto kantin.
                  </span>

                  <div className="seller-setting-image-buttons">
                    <button
                      type="button"
                      onClick={() =>
                        profileInputRef.current?.click()
                      }
                      disabled={
                        profileImageLoading
                      }
                    >
                      <Upload
                        size={15}
                      />

                      {profileImageLoading
                        ? "Memproses..."
                        : profileImage
                        ? "Ganti Foto"
                        : "Pilih Foto"}
                    </button>

                    {profileImage && (
                      <button
                        type="button"
                        className="danger"
                        onClick={
                          removeProfileImage
                        }
                      >
                        <Trash2
                          size={15}
                        />

                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <input
                ref={
                  profileInputRef
                }
                type="file"
                accept="image/*"
                hidden
                onChange={
                  handleProfileImageChange
                }
              />
            </div>

            {/* ===============================================
                SELLER INFO
            ================================================ */}

            <div className="seller-setting-divider" />

            <div className="seller-setting-field">
              <label htmlFor="seller-name">
                Nama seller
              </label>

              <input
                id="seller-name"
                type="text"
                value={sellerName}
                onChange={(event) =>
                  setSellerName(
                    event.target.value
                  )
                }
                placeholder="Nama seller"
                maxLength={100}
              />
            </div>

            <div className="seller-setting-field">
              <label htmlFor="seller-email">
                Email
              </label>

              <input
                id="seller-email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="Email seller"
                maxLength={150}
              />
            </div>

            <div className="seller-setting-divider" />

            <div className="seller-setting-subheading">
              <Store size={17} />

              <div>
                <strong>
                  Informasi Kantin
                </strong>

                <span>
                  Informasi yang akan
                  dilihat oleh pembeli.
                </span>
              </div>
            </div>

            <div className="seller-setting-field">
              <label htmlFor="store-name">
                Nama kantin
              </label>

              <input
                id="store-name"
                type="text"
                value={storeName}
                onChange={(event) =>
                  setStoreName(
                    event.target.value
                  )
                }
                placeholder="Contoh: Kantin Bu Sari"
                maxLength={100}
              />
            </div>

            <div className="seller-setting-field">
              <label htmlFor="store-description">
                Deskripsi kantin
              </label>

              <textarea
                id="store-description"
                value={
                  storeDescription
                }
                onChange={(event) =>
                  setStoreDescription(
                    event.target.value
                  )
                }
                placeholder="Deskripsi singkat tentang kantin..."
                maxLength={300}
                rows={4}
              />
            </div>

            {/* STORE STATUS */}

            <div className="seller-setting-open-row">
              <div>
                <strong>
                  Status kantin
                </strong>

                <span>
                  Tentukan apakah kantin
                  sedang menerima pesanan.
                </span>
              </div>

              <button
                type="button"
                className={`seller-setting-switch ${
                  storeOpen
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setStoreOpen(
                    !storeOpen
                  )
                }
                aria-label="Status kantin"
              >
                <span />
              </button>
            </div>

            <div className="seller-setting-open-status">
              <span
                className={
                  storeOpen
                    ? "open"
                    : "closed"
                }
              >
                {storeOpen
                  ? "Kantin sedang buka"
                  : "Kantin sedang tutup"}
              </span>
            </div>

            {/* MESSAGE */}

            {profileMessage && (
              <div
                className={`seller-setting-profile-message ${
                  profileMessageType
                }`}
              >
                {profileMessageType ===
                "success" ? (
                  <CheckCircle2
                    size={17}
                  />
                ) : (
                  <XCircle
                    size={17}
                  />
                )}

                <span>
                  {profileMessage}
                </span>
              </div>
            )}

            {/* SAVE */}

            <button
              type="submit"
              className="seller-setting-save-button"
              disabled={
                savingProfile ||
                profileImageLoading ||
                bannerImageLoading
              }
            >
              <Save size={17} />

              {savingProfile
                ? "Menyimpan..."
                : "Simpan Pengaturan"}
            </button>
          </form>
        </section>

        {/* ===================================================
            PASSWORD
        ==================================================== */}

        <section className="seller-setting-card">
          <div className="seller-setting-card-heading">
            <div className="seller-setting-section-icon">
              <Lock size={19} />
            </div>

            <div>
              <span>
                KEAMANAN
              </span>

              <h2>
                Ganti Password
              </h2>

              <p>
                Perbarui password akun
                seller secara berkala.
              </p>
            </div>
          </div>

          <form
            className="seller-setting-form"
            onSubmit={
              handlePasswordSubmit
            }
          >
            <div className="seller-setting-field">
              <label htmlFor="current-password">
                Password saat ini
              </label>

              <div className="seller-setting-password">
                <input
                  id="current-password"
                  type={
                    showCurrentPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    currentPassword
                  }
                  onChange={(event) =>
                    setCurrentPassword(
                      event.target
                        .value
                    )
                  }
                  placeholder="Masukkan password saat ini"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowCurrentPassword(
                      !showCurrentPassword
                    )
                  }
                  aria-label="Tampilkan password"
                >
                  {showCurrentPassword ? (
                    <EyeOff
                      size={17}
                    />
                  ) : (
                    <Eye
                      size={17}
                    />
                  )}
                </button>
              </div>
            </div>

            <div className="seller-setting-field">
              <label htmlFor="new-password">
                Password baru
              </label>

              <div className="seller-setting-password">
                <input
                  id="new-password"
                  type={
                    showNewPassword
                      ? "text"
                      : "password"
                  }
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(
                      event.target
                        .value
                    )
                  }
                  placeholder="Minimal 6 karakter"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowNewPassword(
                      !showNewPassword
                    )
                  }
                  aria-label="Tampilkan password"
                >
                  {showNewPassword ? (
                    <EyeOff
                      size={17}
                    />
                  ) : (
                    <Eye
                      size={17}
                    />
                  )}
                </button>
              </div>
            </div>

            <div className="seller-setting-field">
              <label htmlFor="confirm-password">
                Konfirmasi password baru
              </label>

              <div className="seller-setting-password">
                <input
                  id="confirm-password"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    confirmPassword
                  }
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target
                        .value
                    )
                  }
                  placeholder="Ulangi password baru"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  aria-label="Tampilkan password"
                >
                  {showConfirmPassword ? (
                    <EyeOff
                      size={17}
                    />
                  ) : (
                    <Eye
                      size={17}
                    />
                  )}
                </button>
              </div>
            </div>

            {passwordMessage && (
              <div
                className={`seller-setting-password-message ${
                  passwordMessageType
                }`}
              >
                {passwordMessageType ===
                "success" ? (
                  <CheckCircle2
                    size={17}
                  />
                ) : (
                  <XCircle
                    size={17}
                  />
                )}

                <span>
                  {passwordMessage}
                </span>
              </div>
            )}

            <button
              type="submit"
              className="seller-setting-save-button"
              disabled={
                changingPassword
              }
            >
              <Lock size={17} />

              {changingPassword
                ? "Menyimpan Password..."
                : "Ganti Password"}
            </button>
          </form>
        </section>

        {/* ===================================================
            ACCOUNT INFO
        ==================================================== */}

        <section className="seller-setting-account-info">
          <div>
            <span>
              AKUN AKTIF
            </span>

            <strong>
              {sellerName ||
                "Seller"}
            </strong>

            <p>
              Pengaturan akun seller
              Canteenly.
            </p>
          </div>

          <div className="seller-setting-account-status">
            <span />
            Aktif
          </div>
        </section>
      </main>
    </div>
  );
}

export default SellerSetting;