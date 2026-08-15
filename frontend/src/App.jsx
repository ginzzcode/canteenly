import { Routes, Route, Navigate } from "react-router-dom";

import BuyerDashboard from "./buyer/BuyerDashboard";
import StorePage from "./buyer/StorePage";
import Checkout from "./buyer/Checkout";
import OrderSuccess from "./buyer/OrderSuccess";

import SellerLogin from "./seller/SellerLogin";
import SellerDashboard from "./seller/SellerDashboard";
import SellerMenu from "./seller/SellerMenu";
import SellerOrders from "./seller/SellerOrders";
import SellerSetting from "./seller/SellerSetting";

import Admin from "./Admin";

function App() {
  return (
    <Routes>
      {/* ========================================
          BUYER
      ======================================== */}

      <Route
        path="/buyer"
        element={<BuyerDashboard />}
      />

      <Route
        path="/buyer/store/:storeId"
        element={<StorePage />}
      />

      <Route
        path="/buyer/checkout"
        element={<Checkout />}
      />

      <Route
        path="/buyer/order-success"
        element={<OrderSuccess />}
      />

      {/* ========================================
          SELLER & ADMIN LOGIN
      ======================================== */}

      <Route
        path="/seller/login"
        element={<SellerLogin />}
      />

      {/* ========================================
          SELLER
      ======================================== */}

      <Route
        path="/seller/dashboard"
        element={<SellerDashboard />}
      />

      <Route
        path="/seller/menu"
        element={<SellerMenu />}
      />

      <Route
        path="/seller/orders"
        element={<SellerOrders />}
      />

      <Route
        path="/seller/settings"
        element={<SellerSetting />}
      />

      {/* ========================================
          ADMIN
      ======================================== */}

      <Route
        path="/admin/dashboard"
        element={<Admin />}
      />

      {/* ========================================
          DEFAULT
      ======================================== */}

      <Route
        path="/"
        element={
          <Navigate
            to="/buyer"
            replace
          />
        }
      />

      {/* ========================================
          NOT FOUND
      ======================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/buyer"
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;