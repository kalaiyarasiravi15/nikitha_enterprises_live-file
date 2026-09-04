import React, { useState, useEffect } from 'react';
import {
  RiDashboardFill, RiShoppingBag3Fill, RiPriceTag3Fill,
  RiUser3Fill, RiImage2Fill, RiStarFill,
  RiStackFill, RiArrowDownSLine, RiLogoutBoxRFill,
  RiMailFill, RiBarChartGroupedFill, RiTicketFill,
  RiTimerFlashFill, RiSettings4Fill
} from "react-icons/ri";
import axios from 'axios';
import { toast } from 'react-toastify';
import './Sidebar.css';

import { API } from '../config';
import logoImage from '../assets/logo.jpg';

const Sidebar = ({ setActivePage, activePage, setOrderStatus, orderStatus }) => {
  const [orderOpen,   setOrderOpen]   = useState(false);
  const [inboxCount, setInboxCount] = useState(0);
  const [preorderCount, setPreorderCount] = useState(0);
  const [cancelCount, setCancelCount] = useState(0);

  const orderStatuses = ["Pending", "Confirmed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];
  const adminRole = localStorage.getItem('adminRole') || 'admin';

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const r = await axios.get(`${API}/dashboard/badges`);
        if (r.data) {
          setInboxCount(r.data.inboxCount || 0);
          setPreorderCount(r.data.preorderCount || 0);
          setCancelCount(r.data.cancelCount || 0);
        }
      } catch (e) {}
    };
    fetchBadges();
    window.addEventListener('unread-messages-updated', fetchBadges);
    const interval = setInterval(fetchBadges, 30000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('unread-messages-updated', fetchBadges);
    };
  }, []);

  const handleOrderClick = (status) => {
    setOrderStatus(status);
    setActivePage('orders');
  };

  /* ── Logout with toast confirmation ── */
  const handleLogout = () => {
    toast.warn(
      <div style={{ lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>
        <strong style={{ fontSize: 14 }}>Logout from Admin Panel?</strong>
        <p style={{ margin: '6px 0 10px', fontSize: 13, color: '#64748b' }}>
          You will be redirected to the login page.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              toast.dismiss();
              localStorage.removeItem('adminToken');
              localStorage.removeItem('adminId');
              localStorage.removeItem('adminName');
              localStorage.removeItem('adminRole');
              delete axios.defaults.headers.common.Authorization;

              toast.success('Logged out successfully!', {
                autoClose: 1500,
                onClose: () => { window.location.href = '/login'; },
              });
            }}
            style={{
              background: '#ef4444', color: '#fff', border: 'none',
              borderRadius: 6, padding: '6px 16px', cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
            }}
          >
            Yes, Logout
          </button>
          <button
            onClick={() => toast.dismiss()}
            style={{
              background: '#e2e8f0', color: '#475569', border: 'none',
              borderRadius: 6, padding: '6px 16px', cursor: 'pointer',
              fontWeight: 600, fontSize: 13,
            }}
          >
            Cancel
          </button>
        </div>
      </div>,
      {
        autoClose: false,
        closeOnClick: false,
        closeButton: false,
        icon: false,
        position: 'top-center',
      }
    );
  };

  const navItem = (page, icon, label, badge = null) => (
    <div
      className={`nav-item ${activePage === page ? 'active' : ''}`}
      onClick={() => { setActivePage(page); setOrderOpen(false); }}
    >
      <div className="nav-left">{icon} {label}</div>
      {badge > 0 && <span className="unread-badge">{badge}</span>}
    </div>
  );

  return (
    <aside className="ars-sidebar">
      <div className="sidebar-brand-container">
        <div className="sidebar-logo-text-wrap">
          <img src={logoImage} alt="Anyra's Trove - People First" className="sidebar-logo-img" />
        </div>
      </div>

      <nav className="ars-nav">
        <div className="nav-section-label">Main Menu</div>
        {navItem('dashboard', <RiDashboardFill />, 'Dashboard')}

        {/* Orders with submenu */}
        <div
          className={`nav-item ${activePage === 'orders' ? 'active' : ''} ${orderOpen ? 'open-parent' : ''}`}
          onClick={() => {
            setOrderOpen(!orderOpen);
            if (!orderOpen && activePage !== 'orders') handleOrderClick('All');
          }}
        >
          <div className="nav-left"><RiShoppingBag3Fill /> Orders</div>
          <RiArrowDownSLine className={`arrow-icon ${orderOpen ? 'rotate' : ''}`} />
        </div>

        {orderOpen && (
          <div className="order-submenu">
            <div
              className={`sub-item ${activePage === 'orders' && orderStatus === 'All' ? 'sub-active' : ''}`}
              onClick={() => handleOrderClick('All')}
            >All Orders</div>
            {adminRole === 'admin' && (
              <div
                className={`sub-item ${activePage === 'cancellation-requests' ? 'sub-active' : ''}`}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => { setActivePage('cancellation-requests'); setOrderOpen(false); }}
              >
                <span>Cancellation Requests</span>
                {cancelCount > 0 && <span className="unread-badge" style={{position:'static', marginLeft:'auto'}}>{cancelCount}</span>}
              </div>
            )}
            {orderStatuses.map(s => (
              <div key={s}
                className={`sub-item ${activePage === 'orders' && orderStatus === s ? 'sub-active' : ''}`}
                onClick={() => handleOrderClick(s)}
              >{s}</div>
            ))}
          </div>
        )}
        {navItem('preorders', <RiTimerFlashFill />, 'Pre-booking Orders', preorderCount)}

        <div className="nav-section-label">Inventory</div>
        {navItem('products',   <RiStackFill />,     'Products')}
        {navItem('stock',      <RiStackFill />,     'Stock')}
        {navItem('categories', <RiPriceTag3Fill />, 'Categories')}
        {navItem('brands',     <RiPriceTag3Fill />, 'Brands')}

        <div className="nav-section-label">Media</div>
        {navItem('banner',       <RiImage2Fill />,     'Banners')}
        {navItem('deal-of-day',  <RiTimerFlashFill />, 'Deal of Day')}
        {navItem('offer-banner', <RiImage2Fill />,     'Offer Banner')}

        <div className="nav-section-label">Marketing</div>
        {navItem('coupons', <RiTicketFill />, 'Coupons')}
        {navItem('newsletter', <RiMailFill />, 'Newsletter')}

        <div className="nav-section-label">User Management</div>
        {navItem('customers', <RiUser3Fill />,          'Customers')}
        {navItem('reviews',   <RiStarFill />,           'Reviews')}
        {navItem('inbox',     <RiMailFill />,            'Inbox', inboxCount)}
        {adminRole === 'admin' && navItem('reports',   <RiBarChartGroupedFill />, 'Reports')}

        {adminRole === 'admin' && (
          <>
            <div className="nav-section-label">Shipping & Returns</div>
            {navItem('shipping-zones', <RiSettings4Fill />, 'Shipping Zones')}
            {navItem('cod-tracker',    <RiBarChartGroupedFill />, 'Shipping Tracker')}
            {navItem('cancel-returns', <RiTimerFlashFill />, 'Cancel & Returns')}
          </>
        )}

        {adminRole === 'admin' && (
          <>
            <div className="nav-section-label">System</div>
            {navItem('settings', <RiSettings4Fill />, 'Settings')}
          </>
        )}

        <div className="nav-section-label">Pages</div>
        {navItem('about-settings', <RiSettings4Fill />, 'About Page')}
        {navItem('contact-settings', <RiSettings4Fill />, 'Contact Page')}

        <div className="nav-item logout-item" onClick={handleLogout}>
          <div className="nav-left"><RiLogoutBoxRFill className="logout-icon" /> Logout</div>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
