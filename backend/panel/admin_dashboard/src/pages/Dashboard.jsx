
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  RiEyeLine, RiShoppingBag3Line, RiCloseLine,
  RiTrophyLine, RiMoneyDollarCircleLine, RiBarChartLine,
  RiArrowUpLine, RiUser3Line, RiShoppingCartLine,
  RiTeamLine, RiRefreshLine, RiLoader4Line,
  RiTruckLine, RiStore2Line, RiErrorWarningLine
} from 'react-icons/ri';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import './Dashboard.css';

import { API, IMG } from '../config';

const getThumb = (product) => {
  const t = product?.Thumbnails?.[0] || product?.thumbnails?.[0];
  return t?.url || t?.image || product?.mainImage || null;
};

const getBadgeClass = (status) => {
  const map = {
    'Delivered':        'badge-delivered',
    'Pending':          'badge-pending',
    'Shipped':          'badge-shipped',
    'Confirmed':        'badge-confirmed',
    'Cancelled':        'badge-cancelled',
    'Out for Delivery': 'badge-out',
  };
  return map[status] || 'badge-pending';
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        <p className="chart-tooltip-value">
          ₹{Number(payload[0].value).toLocaleString('en-IN')}
        </p>
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const adminRole = localStorage.getItem('adminRole') || 'admin';
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalRegistered: 0,
    totalInactive: 0,
    totalCustomers: 0,
    newOrdersToday: 0,
    deliveredToday: 0,
    totalStock: 0,
    inventoryItems: 0,
    inStockItems: 0,
    lowStockItems: 0,
    outOfStock: 0,
    codSales: 0,
    codOrders: 0,
    paidSales: 0,
    paidOrders: 0,
  });
  const [topProducts, setTopProducts]   = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [revenueData, setRevenueData]   = useState([]);
  const [banners, setBanners]           = useState([]);
  const [offerBanners, setOfferBanners] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, bannersRes, offersRes, ordersRes, productsRes] = await Promise.allSettled([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/banners/all`),
        axios.get(`${API}/offer-banners/admin/all`),
        axios.get(`${API}/orders/recent`),
        axios.get(`${API}/products/all`, { headers: { 'x-admin-request': 'true' } })
      ]);

      let totalStock = 0;
      let inventoryItems = 0;
      let inStockItems = 0;
      let lowStockItems = 0;
      let outOfStock = 0;
      if (productsRes.status === 'fulfilled') {
        const allProducts = Array.isArray(productsRes.value.data)
          ? productsRes.value.data
          : productsRes.value.data?.products || [];

        allProducts.forEach((p) => {
          const selectableVariants = (p.variants || []).filter(v =>
            String(v.variantType || '').trim() && String(v.variantValue || '').trim()
          );

          if (selectableVariants.length > 0) {
            selectableVariants.forEach((v) => {
              const stock = Math.max(0, Number(v.stock) || 0);
              inventoryItems += 1;
              totalStock += Math.max(stock, 0);
              if (stock === 0) outOfStock += 1;
              else if (stock <= 10) lowStockItems += 1;
              else inStockItems += 1;
            });
          } else {
            const stock = Math.max(0, Number(p.stock) || 0);
            inventoryItems += 1;
            totalStock += Math.max(stock, 0);
            if (stock === 0) outOfStock += 1;
            else if (stock <= 10) lowStockItems += 1;
            else inStockItems += 1;
          }
        });
      }

      if (dashRes.status === 'fulfilled') {
        const d = dashRes.value.data;
        const deliveredToday = d.stats?.deliveredToday ?? d.stats?.todayDelivered ?? 0;

        setStats({
          totalSales:      d.stats?.totalSales      || 0,
          totalOrders:     d.stats?.totalOrders     || 0,
          totalRegistered: d.stats?.totalRegistered || 0,
          totalInactive:   d.stats?.totalInactive   || 0,
          totalCustomers:  d.stats?.totalCustomers  || 0,
          newOrdersToday:  d.stats?.newOrdersToday  || 0,
          deliveredToday,
          totalStock:      totalStock,
          inventoryItems,
          inStockItems,
          lowStockItems,
          outOfStock:      outOfStock,
          codSales:        d.stats?.codSales        || 0,
          codOrders:       d.stats?.codOrders       || 0,
          paidSales:       d.stats?.paidSales       || 0,
          paidOrders:      d.stats?.paidOrders       || 0,
        });
        setTopProducts(d.topProducts  || []);
        setRevenueData(d.revenueChart || []);
      } else {
        setStats(prev => ({ ...prev, totalStock, inventoryItems, inStockItems, lowStockItems, outOfStock }));
        setError('Dashboard stats failed: ' + dashRes.reason?.message);
      }

      if (bannersRes.status === 'fulfilled') {
        const d = bannersRes.value.data;
        setBanners(Array.isArray(d) ? d : d.banners || []);
      }
      if (offersRes.status === 'fulfilled') {
        const d = offersRes.value.data;
        setOfferBanners(Array.isArray(d) ? d : d.offerBanners || []);
      }
      if (ordersRes.status === 'fulfilled') {
        const d = ordersRes.value.data;
        const all = Array.isArray(d) ? d : d.orders || [];
        setRecentOrders(all.slice(0, 10));

        setStats(prev => {
          if (prev.deliveredToday === 0) {
            const today = new Date().toDateString();
            const count = all.filter(o =>
              (o.orderStatus === 'Delivered' || o.status === 'Delivered') &&
              new Date(o.updatedAt || o.createdAt).toDateString() === today
            ).length;
            return { ...prev, deliveredToday: count };
          }
          return prev;
        });
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const maxVal = Math.max(...revenueData.map(d => Number(d.val) || 0), 1);

  if (loading) return (
    <div className="dashboard-container">
      <div className="dash-loading">
        <RiLoader4Line className="spin" size={40} />
        <p>Loading dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="dashboard-container">

      {/* ── HEADER ── */}
      <div className="header-section">
        <div>
          <h1>Admin <span className="gold-text">Insights</span></h1>
          <p className="header-sub">Welcome back — here's your store overview</p>
        </div>
        <div className="header-right">
          <button className="refresh-btn" onClick={fetchAll} title="Refresh">
            <RiRefreshLine />
          </button>
          <span className="date-badge">{new Date().toDateString()}</span>
        </div>
      </div>

      {error && <div className="dash-error"><RiErrorWarningLine style={{ marginRight: 4, verticalAlign: 'middle' }} /> {error}</div>}

      {/* ── STATS ROW 1: Sales & Users ── */}
      <div className="stats-grid stats-grid-4">
        {adminRole === 'admin' ? (
        <div className="s-card gold clickable" onClick={() => navigate('/dashboard/orders?status=Delivered')}>
          <div className="s-card-icon-bg gold-icon"><RiMoneyDollarCircleLine /></div>
          <p>Total Sales (Delivered)</p>
          <h2>₹{Number(stats.totalSales).toLocaleString('en-IN')}</h2>
          <span className="s-trend"><RiArrowUpLine /> View Reports</span>
        </div>
        ) : (
        <div className="s-card gold">
          <div className="s-card-icon-bg gold-icon"><RiMoneyDollarCircleLine /></div>
          <p>Sales Data Restricted</p>
          <h2>--</h2>
        </div>
        )}

        <div className="s-card clickable" onClick={() => navigate('/dashboard/orders')}>
          <div className="s-card-icon-bg blue-icon"><RiShoppingCartLine /></div>
          <p>Total Orders</p>
          <h2>{Number(stats.totalOrders).toLocaleString('en-IN')}</h2>
        </div>

        <div className="s-card clickable" onClick={() => navigate('/dashboard/customers')}>
          <div className="s-card-icon-bg teal-icon"><RiTeamLine /></div>
          <p>Registered Users</p>
          <h2>{Number(stats.totalRegistered).toLocaleString('en-IN')}</h2>
          {stats.totalInactive > 0 && (
            <span style={{ fontSize: '11.5px', color: '#ef4444', fontWeight: 600, display: 'block', marginTop: '4px' }}>
              Inactive (Deleted): {stats.totalInactive}
            </span>
          )}
        </div>

        <div className="s-card clickable" onClick={() => navigate('/dashboard/customers?filter=Active')}>
          <div className="s-card-icon-bg purple-icon"><RiUser3Line /></div>
          <p>Active Customers</p>
          <h2>{Number(stats.totalCustomers).toLocaleString('en-IN')}</h2>
        </div>
      </div>

      {/* ── STATS ROW 2: Orders & Inventory ── */}
      <div className="stats-grid stats-grid-4">
        <div className="s-card blue clickable" onClick={() => navigate('/dashboard/orders?filter=today')}>
          <div className="s-card-icon-bg blue-icon"><RiTrophyLine /></div>
          <p>New Orders Today</p>
          <h2>{Number(stats.newOrdersToday).toLocaleString('en-IN')}</h2>
        </div>

        <div className="s-card green clickable" onClick={() => navigate('/dashboard/orders?status=Delivered&filter=today')}>
          <div className="s-card-icon-bg green-icon"><RiTruckLine /></div>
          <p>Today Deliveries</p>
          <h2>{Number(stats.deliveredToday).toLocaleString('en-IN')}</h2>
          <span className="s-trend s-trend-green"><RiTruckLine /> View Logistics</span>
        </div>

        <div className="s-card amber clickable" onClick={() => navigate('/dashboard/stock')}>
          <div className="s-card-icon-bg amber-icon"><RiStore2Line /></div>
          <p>Available Stock Units</p>
          <h2>{Number(stats.totalStock).toLocaleString('en-IN')}</h2>
          <span className="s-trend s-trend-amber">In stock: {Number(stats.inStockItems).toLocaleString('en-IN')} · Low: {Number(stats.lowStockItems).toLocaleString('en-IN')}</span>
        </div>

        <div className="s-card red clickable" onClick={() => navigate('/dashboard/stock?filter=Out of Stock')}>
          <div className="s-card-icon-bg red-icon"><RiErrorWarningLine /></div>
          <p>Out of Stock Products</p>
          <h2>{Number(stats.outOfStock).toLocaleString('en-IN')}</h2>
          <span className="s-trend s-trend-red"><RiErrorWarningLine /> Restock Now</span>
        </div>
      </div>

      {/* ── STATS ROW 3: Payment Method Overview ── */}
      {adminRole === 'admin' && (
      <>
      <h3 style={{ margin: '28px 0 14px', fontSize: '16px', fontWeight: 700, color: 'var(--navy)' }}>
        Payment Overview (Online vs COD)
      </h3>
      <div className="stats-grid stats-grid-4" style={{ marginBottom: '28px' }}>
        <div className="s-card green clickable" onClick={() => navigate('/dashboard/orders?paymentMethod=Online')}>
          <div className="s-card-icon-bg green-icon"><RiMoneyDollarCircleLine /></div>
          <p>Online Payment Sales</p>
          <h2>₹{Number(stats.paidSales).toLocaleString('en-IN')}</h2>
          <span className="s-trend s-trend-green"><RiArrowUpLine /> Paid Online</span>
        </div>

        <div className="s-card clickable" onClick={() => navigate('/dashboard/orders?paymentMethod=Online')}>
          <div className="s-card-icon-bg blue-icon"><RiShoppingCartLine /></div>
          <p>Online Paid Orders</p>
          <h2>{Number(stats.paidOrders).toLocaleString('en-IN')}</h2>
        </div>

        <div className="s-card amber clickable" onClick={() => navigate('/dashboard/orders?paymentMethod=COD')}>
          <div className="s-card-icon-bg amber-icon"><RiMoneyDollarCircleLine /></div>
          <p>Cash on Delivery Sales</p>
          <h2>₹{Number(stats.codSales).toLocaleString('en-IN')}</h2>
          <span className="s-trend s-trend-amber"><RiTruckLine /> COD Revenue</span>
        </div>

        <div className="s-card clickable" onClick={() => navigate('/dashboard/orders?paymentMethod=COD')}>
          <div className="s-card-icon-bg purple-icon"><RiShoppingCartLine /></div>
          <p>COD Orders Count</p>
          <h2>{Number(stats.codOrders).toLocaleString('en-IN')}</h2>
        </div>
      </div>
      </>
      )}

      {/* ── CHART + TOP PRODUCTS ── */}
      <div className="middle-grid">
        {/* Revenue Chart */}
        <div className="glass-card chart-box">
          <div className="card-head">
            <div>
              <h3>Revenue Trends</h3>
              <span className="card-sub">Monthly — delivered orders</span>
            </div>
          </div>
          <div className="chart-area">
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={revenueData.map(d => ({
                    name:  d.month?.slice(0, 3) || '',
                    value: Number(d.val) || 0,
                    count: Number(d.orderCount) || 0
                  }))}
                  margin={{ top:10, right:10, left:10, bottom:0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,4,74,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize:12, fill:'#9aabcc' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize:11, fill:'#9aabcc' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill:'rgba(0,4,74,0.04)' }} />
                  <Bar dataKey="value" radius={[6,6,0,0]} maxBarSize={48}>
                    {revenueData.map((_, i) => (
                      <Cell key={i} fill={i === revenueData.length - 1 ? '#d4af37' : 'rgba(0,4,74,0.12)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">
                <RiBarChartLine size={36} />
                <p>No revenue data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="glass-card top-selling">
          <div className="card-head">
            <div>
              <h3>Top Selling Products</h3>
              <span className="card-sub">By units sold</span>
            </div>
          </div>
          <div className="product-scroll">
            {topProducts.length > 0 ? topProducts.map((p, i) => {
              const thumb = getThumb(p.Product);
              return (
                <div className="p-item" key={p.productId || i}>
                  <span className={`rank-badge ${i===0?'rank-gold':i===1?'rank-silver':i===2?'rank-bronze':''}`}>
                    #{i + 1}
                  </span>
                  <div className="p-img-wrap">
                    {thumb
                      ? <img src={IMG + thumb} alt={p.Product?.name} className="p-thumb"
                          onError={e => { e.target.style.display = 'none'; }} />
                      : <div className="p-thumb-fallback"><RiShoppingBag3Line /></div>
                    }
                  </div>
                  <div className="p-info">
                    <span className="p-name">{p.Product?.name || 'Product'}</span>
                    <span className="p-sold-sub">
                      {p.totalSold} units · ₹{Number(p.totalRevenue).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-actions">
                    <span className="p-sold-badge">{p.totalSold}</span>
                    <button className="p-eye-btn" onClick={() => setSelectedProduct(p)}>
                      <RiEyeLine />
                    </button>
                  </div>
                </div>
              );
            }) : (
              <p className="empty-msg">No sales data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* ── RECENT ORDERS ── */}
      <div className="glass-card">
        <div className="card-head">
          <div>
            <h3>Recent Orders</h3>
            <span className="card-sub">{recentOrders.length} latest orders</span>
          </div>
          <button className="view-all-link" onClick={() => navigate('/dashboard/orders')}>View All</button>
        </div>
        {recentOrders.length > 0 ? (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(order => (
                <tr
                  key={order.orderId || order.id}
                  className="dash-order-row"
                  onClick={() => navigate(`/dashboard/orders?orderId=${order.orderId || order.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="id-col">#{order.orderId || order.id}</td>
                  <td>{order.Customer?.name || `Customer #${order.customerId}`}</td>
                  <td className="amount-col">₹{Number(order.totalAmount).toLocaleString('en-IN')}</td>
                  <td>
                    <span className={`order-badge ${getBadgeClass(order.orderStatus)}`}>
                      {order.orderStatus}
                    </span>
                  </td>
                  <td className="date-col">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day:'2-digit', month:'short', year:'numeric'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="empty-msg">No orders yet</p>}
      </div>

      {/* ── BANNERS ── */}
      <div className="banner-sections-row">
        {banners.length > 0 && (
          <div className="glass-card flex-1">
            <div className="card-head clickable" onClick={() => navigate('/dashboard/banner')}>
              <h3>Banners</h3>
              <span className="count-badge">{banners.length}</span>
            </div>
            <div className="banner-grid">
              {banners.slice(0, 3).map(b => (
                <div key={b.id} className="banner-item">
                  <img src={IMG + b.image} alt={b.title || 'banner'}
                    onError={e => { e.target.style.display = 'none'; }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {offerBanners.length > 0 && (
          <div className="glass-card flex-1">
            <div className="card-head clickable" onClick={() => navigate('/dashboard/offer-banner')}>
              <h3>Offer Banners</h3>
              <span className="count-badge">{offerBanners.length}</span>
            </div>
            <div className="banner-grid">
              {offerBanners.slice(0, 3).map(o => (
                <div key={o.id} className="banner-item">
                  <img src={IMG + o.image} alt={o.title || 'offer'}
                    onError={e => { e.target.style.display = 'none'; }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── PRODUCT DETAIL MODAL ── */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="product-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Product Details</h3>
              <button className="modal-close" onClick={() => setSelectedProduct(null)}>
                <RiCloseLine />
              </button>
            </div>
            <div className="modal-hero">
              <div className="modal-img-wrap">
                {(() => {
                  const thumb = getThumb(selectedProduct.Product);
                  return thumb
                    ? <img src={IMG + thumb} alt={selectedProduct.Product?.name} className="modal-img"
                        onError={e => { e.target.style.display = 'none'; }} />
                    : <div className="modal-img-fallback"><RiShoppingBag3Line size={40} /></div>;
                })()}
              </div>
              <div className="modal-product-info">
                <h4>{selectedProduct.Product?.name || 'Product'}</h4>
                <div className="modal-stats-row">
                  <div className="modal-stat">
                    <span className="modal-stat-val">{selectedProduct.totalSold}</span>
                    <span className="modal-stat-label">Units Sold</span>
                  </div>
                  <div className="modal-stat">
                    <span className="modal-stat-val gold">
                      ₹{Number(selectedProduct.totalRevenue).toLocaleString('en-IN')}
                    </span>
                    <span className="modal-stat-label">Total Revenue</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
