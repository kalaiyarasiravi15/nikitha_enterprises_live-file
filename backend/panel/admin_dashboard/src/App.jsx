import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Sidebar        from './components/Sidebar';
import Navbar         from './components/Navbar';
import Dashboard      from './pages/Dashboard';
import ProductPage    from './pages/ProductPage';
import OrderPage      from './pages/OrderPage';
import CategoryPage   from './pages/Category';
import BrandPage      from './pages/BrandPage';
import CustomerPage   from './pages/CustomerPage';
import Login          from './pages/Login';
import ProtectedRoute from './ProtectedRoute';
import ReviewPage     from './pages/ReviewPage';
import BannerPage     from './pages/BannerPage';
import InboxPage      from './pages/InboxPage';
import ManageDeals    from './pages/ManageDeals';
import Coupons        from './pages/Coupons';
import Reports        from './pages/Reports';
import StockPage      from './pages/StockPage';
import SettingsPage   from './pages/SettingsPage';
import ManageOfferBanners from './pages/ManageOfferBanners';
import NewsletterPage   from './pages/NewsletterPage';
import ShippingZonesPage from './pages/ShippingZonesPage';
import CodTrackerPage   from './pages/CodTrackerPage';
import CancelReturnsPage from './pages/CancelReturnsPage';
import ContactPageSettings from './pages/ContactPageSettings';
import AboutPageSettings from './pages/AboutPageSettings';
import './App.css';


const AdminLayout = ({ orderStatus, setOrderStatus, todayFilter, setTodayFilter }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const pathSegment = location.pathname.replace('/dashboard', '').replace('/', '') || 'dashboard';
  const activePage  = pathSegment || 'dashboard';

  const setActivePage = (page) => {
    navigate(page === 'dashboard' ? '/dashboard' : `/dashboard/${page}`);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':    return <Dashboard />;
      case 'products':     return <ProductPage />;
      case 'stock':        return <StockPage />;
      case 'categories':   return <CategoryPage />;
      case 'brands':       return <BrandPage />;
      case 'orders':       return <OrderPage orderStatusFilter={orderStatus} setActivePage={setActivePage} todayFilter={todayFilter} setTodayFilter={setTodayFilter} />;
      case 'cancellation-requests': return <OrderPage orderStatusFilter="All" cancellationOnly />;
      case 'preorders':    return <OrderPage orderStatusFilter="All" preorderOnly />;
      case 'customers':    return <CustomerPage />;
      case 'reviews':      return <ReviewPage />;
      case 'banner':       return <BannerPage />;

      case 'deal-of-day':  return <ManageDeals />;
      case 'offer-banner': return <ManageOfferBanners />;
      case 'inbox':        return <InboxPage />;
      case 'coupons':      return <Coupons />;
      case 'reports':        return <Reports />;
      case 'newsletter':     return <NewsletterPage />;
      case 'settings':       return <SettingsPage />;
      case 'shipping-zones': return <ShippingZonesPage />;
      case 'cod-tracker':    return <CodTrackerPage />;
      case 'cancel-returns': return <CancelReturnsPage />;
      case 'contact-settings': return <ContactPageSettings />;
      case 'about-settings': return <AboutPageSettings />;
      default:               return <Dashboard />;
    }
  };


  return (
    <div className="app-layout">
      <Sidebar
        setActivePage={setActivePage}
        activePage={activePage}
        setOrderStatus={setOrderStatus}
        orderStatus={orderStatus}
      />
      <div className="main-content">
        <Navbar setActivePage={setActivePage} />
        <div className="page-body">
          {renderPage()}
        </div>
      </div>
    </div>
  );
};

const token = localStorage.getItem('adminToken');
if (token) {
  axios.defaults.headers.common.Authorization = `Bearer ${token}`;
}
axios.defaults.headers.common['x-admin-request'] = 'true';

function App() {
  const [orderStatus, setOrderStatus] = useState('All');
  const [todayFilter, setTodayFilter] = useState(false);

  useEffect(() => {
    // We also keep this here to catch any runtime changes if needed, 
    // but the initial load is now handled synchronously above.
    const currentToken = localStorage.getItem('adminToken');
    if (currentToken) {
      axios.defaults.headers.common.Authorization = `Bearer ${currentToken}`;
    } else {
      delete axios.defaults.headers.common.Authorization;
    }
    axios.defaults.headers.common['x-admin-request'] = 'true';
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/"      element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AdminLayout orderStatus={orderStatus} setOrderStatus={setOrderStatus} todayFilter={todayFilter} setTodayFilter={setTodayFilter} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/:page"
          element={
            <ProtectedRoute>
              <AdminLayout orderStatus={orderStatus} setOrderStatus={setOrderStatus} todayFilter={todayFilter} setTodayFilter={setTodayFilter} />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <ToastContainer />
    </Router>
  );
}

export default App;
