import React, { useState, useEffect, useRef } from 'react';
import {
  LuBell, LuMessageSquare, LuPackageX,
  LuShoppingBag, LuStar, LuChevronRight
} from "react-icons/lu";
import { RiFilter3Line, RiSearchLine } from "react-icons/ri";
import axios from 'axios';
import './Navbar.css';
import { API, IMG } from '../config';

const TABS = [
  { key: 'all', label: 'All',       countClass: 'all-count' },
  { key: 'out', label: 'Out',       countClass: 'out-count' },
  { key: 'low', label: 'Low Stock', countClass: 'low-count' },
];

const Navbar = ({ setActivePage }) => {
  // ── Message unread count ──
  const [unreadCount,   setUnreadCount]   = useState(0);

  // ── Low-stock bell ──
  const [lowStockItems, setLowStockItems] = useState([]);
  const [showNotifDrop, setShowNotifDrop] = useState(false);
  const [activeTab,     setActiveTab]     = useState('all');
  const notifRef = useRef(null);

  // ── New orders ──
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [showOrderDrop, setShowOrderDrop] = useState(false);
  const [recentOrders,  setRecentOrders]  = useState([]);
  const orderRef = useRef(null);

  // ── Pending reviews ──
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [showReviewDrop,     setShowReviewDrop]     = useState(false);
  const [pendingReviews,     setPendingReviews]     = useState([]);
  const [searchQuery,        setSearchQuery]        = useState('');
  const reviewRef = useRef(null);

  // ── Fetch unread messages ──
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const r = await axios.get(`${API}/contact/unread-count`);
        setUnreadCount(r.data.unreadCount || 0);
      } catch (e) { console.error('Navbar: unread count failed', e); }
    };
    fetchUnread();
    window.addEventListener('unread-messages-updated', fetchUnread);
    const iv = setInterval(fetchUnread, 30000);
    return () => {
      clearInterval(iv);
      window.removeEventListener('unread-messages-updated', fetchUnread);
    };
  }, []);

  // ── Fetch low-stock products ──
  useEffect(() => {
    const fetchLowStock = async () => {
      try {
        const res   = await axios.get(`${API}/products/all`, { headers: { 'x-admin-request': 'true' } });
        const prods = res.data || [];
        const low = prods
          .flatMap(p => {
            const selectableVariants = (p.variants || []).filter(v => v.variantType && v.variantValue);
            if (selectableVariants.length > 0) {
              return selectableVariants.map(v => ({
                id: `variant-${v.id}`,
                name: `${p.name} — ${v.variantType}: ${v.variantValue}`,
                stock: Number(v.stock || 0),
                image: v.mainImage || p.mainImage,
                isOut: Number(v.stock || 0) === 0
              }));
            }
            return [{
              id: `product-${p.id}`,
              name: p.name,
              stock: Number(p.stock || 0),
              image: p.mainImage,
              isOut: Number(p.stock || 0) === 0
            }];
          })
          .filter(p => p.stock <= 10)
          .sort((a, b) => {
            if (a.isOut && !b.isOut) return -1;
            if (!a.isOut && b.isOut) return 1;
            return a.stock - b.stock;
          });
        setLowStockItems(low);
      } catch (e) { console.error('Navbar: low stock failed', e); }
    };
    fetchLowStock();
    window.addEventListener('stock-updated', fetchLowStock);
    const iv = setInterval(fetchLowStock, 60000);
    return () => {
      clearInterval(iv);
      window.removeEventListener('stock-updated', fetchLowStock);
    };
  }, []);

  // ── Fetch pending orders ──
  useEffect(() => {
    const fetchNewOrders = async () => {
      try {
        const res = await axios.get(`${API}/orders/all`, {
          params: { status: 'Pending', page: 1, limit: 10 }
        });
        const orders = res.data?.orders || [];
        setNewOrderCount(res.data?.totalOrders || orders.length);
        setRecentOrders(orders.slice(0, 5));
      } catch (e) { console.error('Navbar: orders failed', e); }
    };
    fetchNewOrders();
    const iv = setInterval(fetchNewOrders, 30000);
    return () => clearInterval(iv);
  }, []);

  // ── Fetch pending reviews only ──
  useEffect(() => {
    const fetchPendingReviews = async () => {
      try {
        const res = await axios.get(`${API}/reviews/all`);
        const all = res.data || [];
        const pending = all.filter(r => r.status === 'pending');
        setPendingReviewCount(pending.length);
        setPendingReviews(pending.slice(0, 5));
      } catch (e) { console.error('Navbar: reviews failed', e); }
    };
    fetchPendingReviews();
    const iv = setInterval(fetchPendingReviews, 45000);
    return () => clearInterval(iv);
  }, []);

  // ── Close all dropdowns on outside click ──
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current  && !notifRef.current.contains(e.target))  setShowNotifDrop(false);
      if (orderRef.current  && !orderRef.current.contains(e.target))  setShowOrderDrop(false);
      if (reviewRef.current && !reviewRef.current.contains(e.target)) setShowReviewDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Derived ──
  const outItems    = lowStockItems.filter(i => i.isOut);
  const lowItems    = lowStockItems.filter(i => !i.isOut);
  const totalNotifs = lowStockItems.length;

  const filteredItems =
    activeTab === 'out' ? outItems :
    activeTab === 'low' ? lowItems :
    lowStockItems;

  const searchLower = searchQuery.trim().toLowerCase();
  const displayItems = searchLower
    ? filteredItems.filter(item => item.name?.toLowerCase().includes(searchLower))
    : filteredItems;

  const tabCount = (key) =>
    key === 'all' ? totalNotifs :
    key === 'out' ? outItems.length :
    lowItems.length;

  const goTo = (page) => {
    setShowOrderDrop(false);
    setShowReviewDrop(false);
    setShowNotifDrop(false);
    setActivePage && setActivePage(page);
  };

  const StarRow = ({ rating }) => (
    <span className="nav-stars">
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ color: n <= rating ? '#d4af37' : '#ddd', fontSize: 11 }}>★</span>
      ))}
    </span>
  );

  return (
    <header className="ars-navbar">

      <div className="nav-search-bar">
        <RiSearchLine className="nav-search-icon" />
        <input
          className="nav-search-input"
          type="search"
          placeholder="Search stock alerts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* ── Right Side ── */}
      <div className="nav-right" style={{ marginLeft: 'auto' }}>

        {/* ── Message / Inbox ── */}
        <div
          className="nav-icon-btn"
          style={{ position: 'relative' }}
          onClick={() => goTo('inbox')}
          title="Inbox"
        >
          <LuMessageSquare size={19} />
          {unreadCount > 0 && (
            <span className="navbar-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </div>

        {/* ══ ORDER NOTIFICATION ══ */}
        <div className="notif-wrapper" ref={orderRef}>
          <div
            className={`nav-icon-btn ${showOrderDrop ? 'active' : ''}`}
            onClick={() => { setShowOrderDrop(v => !v); setShowReviewDrop(false); setShowNotifDrop(false); }}
            title="Pending Orders"
          >
            <LuShoppingBag size={19} />
            {newOrderCount > 0 && (
              <span className="navbar-badge">{newOrderCount > 9 ? '9+' : newOrderCount}</span>
            )}
          </div>

          {showOrderDrop && (
            <div className="notif-dropdown">
              <div className="notif-drop-header">
                <LuShoppingBag size={14} />
                <span className="notif-drop-title">Pending Orders</span>
                <span className="notif-drop-count">{newOrderCount}</span>
              </div>

              {recentOrders.length === 0 ? (
                <div className="notif-empty">
                  <LuShoppingBag size={28} />
                  <p>No pending orders</p>
                </div>
              ) : (
                <div className="notif-list">
                  {recentOrders.map((order, i) => (
                    <div
                      key={order.orderId || i}
                      className="notif-item"
                      onClick={() => goTo('orders')}
                    >
                      <div className="notif-item-icon-box">
                        <LuShoppingBag size={16} />
                      </div>
                      <div className="notif-item-info">
                        <span className="notif-item-name">
                          Order #{order.orderId || `${i + 1}`}
                        </span>
                        <span className="notif-item-sub">
                          {order.Customer?.name || order.customerName || 'Customer'}
                        </span>
                      </div>
                      <span className="notif-item-amount">
                        ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="notif-drop-footer" onClick={() => goTo('orders')}>
                View all orders <LuChevronRight size={12} />
              </div>
            </div>
          )}
        </div>

        {/* ══ REVIEW NOTIFICATION (pending only) ══ */}
        <div className="notif-wrapper" ref={reviewRef}>
          <div
            className={`nav-icon-btn ${showReviewDrop ? 'active' : ''}`}
            onClick={() => { setShowReviewDrop(v => !v); setShowOrderDrop(false); setShowNotifDrop(false); }}
            title="Pending Reviews"
          >
            <LuStar size={19} />
            {pendingReviewCount > 0 && (
              <span className="navbar-badge">{pendingReviewCount > 9 ? '9+' : pendingReviewCount}</span>
            )}
          </div>

          {showReviewDrop && (
            <div className="notif-dropdown">
              <div className="notif-drop-header">
                <LuStar size={14} />
                <span className="notif-drop-title">Pending Reviews</span>
                <span className="notif-drop-count">{pendingReviewCount}</span>
              </div>

              {pendingReviews.length === 0 ? (
                <div className="notif-empty">
                  <LuStar size={28} />
                  <p>No pending reviews</p>
                </div>
              ) : (
                <div className="notif-list">
                  {pendingReviews.map((review, i) => (
                    <div
                      key={review.id || i}
                      className="notif-item"
                      onClick={() => goTo('reviews')}
                    >
                      <div className="notif-review-avatar">
                        {(review.customerInfo?.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="notif-item-info">
                        <span className="notif-item-name">
                          {review.customerInfo?.name || 'Anonymous'}
                        </span>
                        <span className="notif-item-sub">
                          <StarRow rating={Number(review.rating) || 5} />
                          {' '}
                          {(review.feedback || '').slice(0, 28) || 'No comment'}
                          {(review.feedback?.length > 28) ? '…' : ''}
                        </span>
                        {review.productInfo?.name && (
                          <span className="notif-item-product">{review.productInfo.name}</span>
                        )}
                      </div>
                      <span className="notif-pending-chip">Pending</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="notif-drop-footer" onClick={() => goTo('reviews')}>
                View all reviews <LuChevronRight size={12} />
              </div>
            </div>
          )}
        </div>

        {/* ══ BELL / STOCK NOTIFICATION ══ */}
        <div className="notif-wrapper" ref={notifRef}>
          <div
            className={`nav-icon-btn ${showNotifDrop ? 'active' : ''}`}
            onClick={() => {
              setShowNotifDrop(v => !v);
              setShowOrderDrop(false);
              setShowReviewDrop(false);
              setActiveTab('all');
            }}
            title="Stock Alerts"
          >
            <LuBell size={19} />
            {totalNotifs > 0 && (
              <span className="navbar-badge">{totalNotifs > 9 ? '9+' : totalNotifs}</span>
            )}
          </div>

          {showNotifDrop && (
            <div className="notif-dropdown">
              <div className="notif-drop-header">
                <LuBell size={14} />
                <span className="notif-drop-title">Stock Alerts</span>
                <span className="notif-drop-count">{totalNotifs}</span>
              </div>

              <div className="notif-filter-tabs">
                {TABS.map(tab => (
                  <button
                    key={tab.key}
                    className={`notif-tab ${activeTab === tab.key ? 'active-tab' : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                    {tabCount(tab.key) > 0 && (
                      <span className={`tab-count ${activeTab === tab.key ? tab.countClass : ''}`}>
                        {tabCount(tab.key)}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {displayItems.length === 0 ? (
                <div className="notif-empty">
                  <LuPackageX size={28} />
                  <p>
                    {searchLower
                      ? 'No products match your search.'
                      : activeTab === 'out'
                        ? 'No out-of-stock products'
                        : activeTab === 'low'
                          ? 'No low-stock products'
                          : 'All products well stocked'}
                  </p>
                </div>
              ) : (
                <div className="notif-list">
                  {displayItems.map(item => (
                    <div
                      key={item.id}
                      className={`notif-item ${item.isOut ? 'out' : 'low'}`}
                      onClick={() => { setShowNotifDrop(false); setActivePage && setActivePage('products'); }}
                    >
                      <div className="notif-item-img">
                        {item.image
                          ? <img src={IMG + item.image} alt={item.name}
                              onError={e => { e.target.style.display = 'none'; }} />
                          : <LuPackageX size={16} />
                        }
                      </div>
                      <div className="notif-item-info">
                        <span className="notif-item-name">{item.name}</span>
                        <span className={`notif-item-stock ${item.isOut ? 'out' : 'low'}`}>
                          {item.isOut ? 'Out of Stock' : `Only ${item.stock} unit${item.stock !== 1 ? 's' : ''} left`}
                        </span>
                      </div>
                      <span className={`notif-item-badge ${item.isOut ? 'out' : 'low'}`}>
                        {item.stock}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div
                className="notif-drop-footer"
                onClick={() => { setShowNotifDrop(false); setActivePage && setActivePage('products'); }}
              >
                View all products <LuChevronRight size={12} />
              </div>
            </div>
          )}
        </div>

        {/* ── Admin Chip ── */}
        <div className="admin-chip">
          <div className="avatar">{(localStorage.getItem('adminName') || 'Admin').charAt(0).toUpperCase()}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700' }}>{localStorage.getItem('adminName') || 'Admin'}</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>{localStorage.getItem('adminRole') === 'employee' ? 'Employee' : 'Administrator'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
