
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line
} from 'recharts';
import {
  RiDownloadLine, RiCalendarLine, RiShoppingBag3Line,
  RiMoneyDollarCircleLine, RiUser3Line, RiTrophyLine,
  RiArrowUpLine, RiLoader4Line, RiFileChartLine,
  RiTimeLine, RiTeamLine, RiShoppingCartLine,
  RiRefreshLine, RiTruckLine, RiArrowDownSLine, RiArrowRightSLine
} from 'react-icons/ri';
import './Reports.css';

import { API, IMG } from '../config';

const fmt  = (n) => Number(n || 0).toLocaleString('en-IN');
const fmtK = (v) => Number(v) >= 1000 ? `₹${(Number(v) / 1000).toFixed(1)}k` : `₹${Number(v) || 0}`;

const getThumb = (product) => {
  if (product?.mainImage) return product.mainImage;
  const t = product?.Thumbnails?.[0] || product?.thumbnails?.[0];
  return t?.url || t?.image || null;
};

const COLORS = ['#d4af37', '#00044a', '#1a237e', '#283593', '#3949ab', '#5c6bc0', '#e91e63', '#009688'];
const STATUS_COLORS = {
  'Delivered':        '#22c55e',
  'Pending':          '#f59e0b',
  'Shipped':          '#3b82f6',
  'Confirmed':        '#6366f1',
  'Cancelled':        '#ef4444',
  'Out for Delivery': '#14b8a6',
};

// ── Custom Recharts Tooltip ────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="rpt-tooltip">
        <p className="rpt-tooltip-label">{label}</p>
        {payload.map((p, i) => {
          const isCount = ['order', 'count', 'user'].some(w => p.name?.toLowerCase().includes(w));
          return (
            <div key={i}>
              <p style={{ color: p.color, margin: '2px 0', fontSize: 12, fontWeight: 600 }}>
                {p.name}: {isCount ? p.value : `₹${fmt(p.value)}`}
              </p>
              {p.payload?.orders !== undefined && p.name === 'Revenue' && (
                <p style={{ margin: '4px 0 0 0', fontSize: 11, fontWeight: 500, color: '#9aabcc' }}>
                  • {p.payload.orders} Orders Placed
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

// ── Main Component ─────────────────────────────────────────────────────────
export default function Reports() {
  const navigate = useNavigate();
  const [range, setRange]                     = useState('monthly');
  const [loading, setLoading]                 = useState(true);
  const [downloading, setDownloading]         = useState(false);
  const [stats, setStats]                     = useState({});
  const [revenueChart, setRevenueChart]       = useState([]);
  const [allRevenueChart, setAllRevenueChart] = useState([]);
  const [topProducts, setTopProducts]         = useState([]);
  const [statusDist, setStatusDist]           = useState([]);
  const [newUsersDaily, setNewUsersDaily]     = useState([]);
  const [newOrdersDaily, setNewOrdersDaily]   = useState([]);
  const [topCustomers, setTopCustomers]       = useState([]);
  const [selCustomer, setSelCustomer]         = useState(null);
  const [custOrders, setCustOrders]           = useState([]);
  const [custLoading, setCustLoading]         = useState(false);
  const [error, setError]                     = useState('');
  const [startDate, setStartDate]             = useState('');
  const [endDate, setEndDate]                 = useState('');

  const [courierSummary, setCourierSummary]   = useState([]);
  const [courierOrders, setCourierOrders]     = useState([]);
  const [settlementRange, setSettlementRange] = useState('weekly');
  const [settlementLoading, setSettlementLoading] = useState(false);

  const fetchCourierSettlements = async () => {
    setSettlementLoading(true);
    try {
      const res = await axios.get(`${API}/orders/shipping/settlement-summary`, {
        params: { range: settlementRange }
      });
      if (res.data.success) {
        setCourierSummary(res.data.summary || []);
        setCourierOrders(res.data.orders || []);
      }
    } catch (err) {
      console.error('Failed to load courier settlements', err);
    } finally {
      setSettlementLoading(false);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, custRes] = await Promise.allSettled([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/customers/all`),
      ]);

      if (dashRes.status === 'fulfilled') {
        const d = dashRes.value.data;
        setStats(d.stats || {});
        setRevenueChart(d.revenueChart       || []);
        setAllRevenueChart(d.allRevenueChart || []);
        setTopProducts(d.topProducts         || []);
        setStatusDist(
          (d.statusDist || []).map(s => ({
            name:  s.orderStatus,
            value: parseInt(s.count) || 0,
          }))
        );
        setNewUsersDaily(d.newUsersDaily   || []);
        setNewOrdersDaily(d.newOrdersDaily || []);
      } else {
        setError('Stats failed: ' + dashRes.reason?.message);
      }

      if (custRes.status === 'fulfilled') {
        const d = custRes.value.data;
        setTopCustomers(Array.isArray(d) ? d : d.customers || []);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    fetchCourierSettlements();
  }, [settlementRange]);

  const loadCustomerOrders = async (customer) => {
    if (selCustomer?.id === customer.id) {
      setSelCustomer(null);
      setCustOrders([]);
      return;
    }
    setSelCustomer(customer);
    setCustLoading(true);
    try {
      const res  = await axios.get(`${API}/orders/customer/${customer.id}`);
      const data = res.data;
      setCustOrders(Array.isArray(data) ? data : data.orders || []);
    } catch {
      setCustOrders([]);
    }
    setCustLoading(false);
  };

  const displayRevenue = range === '7days'
    ? newOrdersDaily.map(d => ({
        name:  new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit' }),
        value: parseFloat(d.revenue) || 0,
        orders: parseInt(d.orders) || 0
      }))
    : revenueChart.map(d => ({
        name:  d.month?.slice(0, 3) || '',
        value: parseFloat(d.val)    || 0,
        orders: parseInt(d.orderCount) || 0
      }));

  const displayOrders = range === '7days'
    ? newOrdersDaily.map(d => ({
        name:  new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit' }),
        count: parseInt(d.count) || 0,
      }))
    : allRevenueChart.map(d => ({
        name:  d.month?.slice(0, 3) || '',
        count: parseInt(d.orderCount) || 0,
      }));

  // ── PDF Download ──────────────────────────────────────────────────────────
  const downloadPDF = async () => {
    setDownloading(true);

    // 1. Sort customers by total spend (desc)
    const sortedCustomers = [...topCustomers];

    // 2. Fetch all customer orders in parallel
    const customerOrderMap = {};
    await Promise.allSettled(
      sortedCustomers.map(async (c) => {
        try {
          const res  = await axios.get(`${API}/orders/customer/${c.id}`);
          const data = res.data;
          customerOrderMap[c.id] = Array.isArray(data) ? data : data.orders || [];
        } catch {
          customerOrderMap[c.id] = c.Orders || [];
        }
      })
    );

    // Filter orders by selected date range
    let allFilteredOrders = [];
    const customerFilteredOrders = {};

    sortedCustomers.forEach(c => {
      let orders = customerOrderMap[c.id] || [];
      if (startDate) {
        orders = orders.filter(o => new Date(o.createdAt) >= new Date(startDate + 'T00:00:00'));
      }
      if (endDate) {
        orders = orders.filter(o => new Date(o.createdAt) <= new Date(endDate + 'T23:59:59'));
      }
      customerFilteredOrders[c.id] = orders;
      allFilteredOrders.push(...orders);
    });

    // Re-calculate statistics for the chosen period
    const totalOrdersPeriod = allFilteredOrders.length;
    const totalSalesPeriod = allFilteredOrders
      .filter(o => (o.orderStatus || o.status) === 'Delivered')
      .reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
    const activeCustomersPeriod = new Set(allFilteredOrders.map(o => o.customerId)).size;
    const discountAmountPeriod = allFilteredOrders.reduce((sum, o) => sum + (parseFloat(o.discountAmount) || 0), 0);

    // Re-calculate Top Products for the chosen period
    const productSales = {};
    allFilteredOrders.forEach(o => {
      const slots = o.slots || o.items || [];
      slots.forEach(sl => {
        const pId = sl.productId;
        const name = sl.Product?.name || sl.productName || `Product #${pId}`;
        const sold = parseInt(sl.quantity) || 0;
        const rev = (parseFloat(sl.salesPrice) || 0) * sold;
        if (!productSales[pId]) {
          productSales[pId] = { name, totalSold: 0, totalRevenue: 0 };
        }
        productSales[pId].totalSold += sold;
        productSales[pId].totalRevenue += rev;
      });
    });

    const periodTopProducts = Object.values(productSales)
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 8);

    // Build Top Products table rows
    const topProdRows = periodTopProducts.map((p, i) => {
      const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'normal';
      return `<tr>
        <td><span class="rank rank-${rankClass}">#${i + 1}</span></td>
        <td><strong>${p.name || '—'}</strong></td>
        <td class="center">${p.totalSold || 0} units</td>
        <td class="right green"><strong>₹${fmt(p.totalRevenue || 0)}</strong></td>
      </tr>`;
    }).join('');

    // Re-sort customers based on purchase totals during this period
    const sortedPeriodCustomers = [...sortedCustomers]
      .map(c => ({
        ...c,
        periodSpent: (customerFilteredOrders[c.id] || []).reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0),
        periodOrdersCount: (customerFilteredOrders[c.id] || []).length
      }))
      .filter(c => c.periodSpent > 0 || c.periodOrdersCount > 0)
      .sort((a, b) => b.periodSpent - a.periodSpent);

    // Build Customer blocks with purchase lists
    const custBlocks = sortedPeriodCustomers.map((c, i) => {
      const orders     = customerFilteredOrders[c.id] || [];
      const totalSpent = c.periodSpent;
      const rankClass  = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'normal';
      const delivered  = orders.filter(o => (o.orderStatus || o.status) === 'Delivered').length;
      const cancelled  = orders.filter(o => (o.orderStatus || o.status) === 'Cancelled').length;

      const orderRows = orders.map((o) => {
        const oid    = o.orderId || o.id;
        const status = o.orderStatus || o.status || '—';
        const slots  = o.slots || o.items || [];

        const statusColor = {
          'Delivered':        '#15803d',
          'Cancelled':        '#c62828',
          'Pending':          '#b45309',
          'Shipped':          '#1565c0',
          'Confirmed':        '#283593',
          'Out for Delivery': '#00695c',
        }[status] || '#00044a';

        const statusBg = {
          'Delivered':        '#e8f5e9',
          'Cancelled':        '#ffebee',
          'Pending':          '#fff8e1',
          'Shipped':          '#e3f2fd',
          'Confirmed':        '#e8eaf6',
          'Out for Delivery': '#e0f2f1',
        }[status] || '#f0f4ff';

        const productChips = slots.map(sl =>
          `<span class="chip">${sl.Product?.name || sl.productName || `#${sl.productId}`} ×${sl.quantity} — ₹${fmt(sl.salesPrice)}</span>`
        ).join('');

        const discountCell = parseFloat(o.discountAmount) > 0
          ? `<span class="disc">-₹${fmt(o.discountAmount)}</span>` : '—';

        return `<tr>
          <td class="oid">#${oid}</td>
          <td class="green"><strong>₹${fmt(o.totalAmount)}</strong></td>
          <td>${discountCell}</td>
          <td>${o.paymentMethod || '—'}</td>
          <td><span class="badge" style="background:${statusBg};color:${statusColor}">${status}</span></td>
          <td>${productChips || '—'}</td>
          <td class="muted">${new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
        </tr>`;
      }).join('');

      return `
        <div class="cust-block">
          <div class="cust-header">
            <span class="rank rank-${rankClass}">#${i + 1}</span>
            <div class="cust-info">
              <strong>${c.name || '—'}</strong>
              <span class="muted">${c.email || '—'} &nbsp;|&nbsp; ${c.phone || '—'}</span>
            </div>
            <div class="cust-pills">
              <span class="pill navy">₹${fmt(totalSpent)} spent</span>
              <span class="pill gray">${orders.length} orders</span>
              <span class="pill green-p">${delivered} delivered</span>
              ${cancelled > 0 ? `<span class="pill red-p">${cancelled} cancelled</span>` : ''}
            </div>
          </div>
          ${orders.length > 0 ? `
          <table class="inner-table">
            <thead><tr>
              <th>Order ID</th><th>Amount</th><th>Discount</th>
              <th>Payment</th><th>Status</th><th>Products</th><th>Date</th>
            </tr></thead>
            <tbody>${orderRows}</tbody>
          </table>` : '<p class="no-orders">No orders found.</p>'}
        </div>`;
    }).join('');

    const periodStr = (startDate || endDate)
      ? `${startDate ? new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Beginning'} to ${endDate ? new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today'}`
      : 'All Time';

    // ── 5. Open print window ──────────────────────────────────────────────
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>NIKITHA ENTERPRISES — Analytics Report</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;padding:36px 40px;color:#1a1a2e;background:#fff;font-size:13px}
  .report-header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #dc2626;padding-bottom:14px;margin-bottom:6px}
  .report-title{font-size:22px;font-weight:800;color:#111827;text-transform:uppercase;letter-spacing:1px}
  .report-title span{color:#dc2626}
  .report-meta{font-size:11px;color:#7a8aaa;text-align:right;line-height:1.7}
  .stats-strip{display:flex;gap:10px;margin:18px 0 24px}
  .stat-box{flex:1;background:#f8f9fa;border-left:4px solid #dc2626;border-radius:8px;padding:12px 14px;box-shadow:0 2px 4px rgba(0,0,0,0.02)}
  .stat-box h3{font-size:19px;color:#111827;font-weight:700}
  .stat-box p{font-size:9px;color:#7a8aaa;text-transform:uppercase;letter-spacing:.5px;margin-top:3px}
  h2{font-size:14px;font-weight:700;color:#111827;border-left:4px solid #dc2626;padding-left:10px;margin:28px 0 14px;text-transform:uppercase}
  h2 small{font-size:10px;color:#7a8aaa;font-weight:400;margin-left:8px;text-transform:none}
  table{width:100%;border-collapse:collapse;font-size:12px}
  thead tr{background:#111827}
  th{color:#dc2626;padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px;font-weight:600}
  td{padding:9px 12px;border-bottom:1px solid #eef0f8;vertical-align:middle}
  tr:nth-child(even) td{background:#f8f9ff}
  tr:last-child td{border-bottom:none}
  .rank{display:inline-block;font-weight:700;padding:3px 9px;border-radius:6px;font-size:11px;white-space:nowrap}
  .rank-gold{background:rgba(212,175,55,0.18);color:#a07c10}
  .rank-silver{background:rgba(158,158,158,0.15);color:#616161}
  .rank-bronze{background:rgba(188,140,75,0.15);color:#8d5b25}
  .rank-normal{background:rgba(17,24,39,0.07);color:#111827}
  .cust-block{border:1px solid #e2e8f0;border-radius:12px;margin-bottom:22px;overflow:hidden;page-break-inside:avoid}
  .cust-header{display:flex;align-items:center;gap:12px;background:#f8faff;padding:14px 16px;border-bottom:1px solid #e2e8f0;flex-wrap:wrap}
  .cust-info{flex:1;min-width:0}
  .cust-info strong{font-size:14px;color:#111827;display:block}
  .cust-pills{display:flex;gap:6px;flex-wrap:wrap;margin-left:auto}
  .pill{padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700}
  .navy{background:#111827;color:#dc2626}
  .gray{background:#f1f5f9;color:#475569}
  .green-p{background:#e8f5e9;color:#15803d}
  .red-p{background:#ffebee;color:#c62828}
  .inner-table{width:100%;border-collapse:collapse;font-size:11px}
  .inner-table th{background:rgba(17,24,39,0.05);color:#111827;padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.4px;font-weight:600}
  .inner-table td{padding:8px 12px;border-bottom:1px solid #f0f0f8;vertical-align:top}
  .inner-table tr:last-child td{border-bottom:none}
  .inner-table tr:nth-child(even) td{background:#fafbff}
  .oid{font-weight:700;color:#111827;white-space:nowrap}
  .green{color:#15803d}.muted{color:#7a8aaa}
  .center{text-align:center}.right{text-align:right}
  .disc{background:#fef3c7;color:#92400e;border-radius:5px;padding:2px 7px;font-size:10px;font-weight:600}
  .badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:600;white-space:nowrap}
  .chip{display:inline-block;background:#f0f4ff;color:#111827;border-radius:5px;padding:2px 7px;font-size:10px;margin:2px 2px 2px 0}
  .no-orders{color:#aaa;font-size:12px;padding:12px 16px;font-style:italic}
  .footer{margin-top:36px;text-align:center;color:#aaa;font-size:10px;border-top:1px solid #eee;padding-top:12px}
  @media print{body{padding:18px 22px}.cust-block{page-break-inside:avoid}}
</style></head><body>
  <div class="report-header">
    <div>
      <div class="report-title">NIKITHA <span>ENTERPRISES</span></div>
      <div class="muted" style="margin-top:4px;font-size:11px">Corporate Sales &amp; Performance Audit</div>
    </div>
    <div class="report-meta">Generated: ${new Date().toLocaleString('en-IN')}<br/>Period: ${periodStr}</div>
  </div>
  <div class="stats-strip">
    <div class="stat-box"><h3>₹${fmt(totalSalesPeriod)}</h3><p>Delivered Sales</p></div>
    <div class="stat-box"><h3>${fmt(totalOrdersPeriod)}</h3><p>Total Orders</p></div>
    <div class="stat-box"><h3>₹${fmt(discountAmountPeriod)}</h3><p>Discounts Applied</p></div>
    <div class="stat-box"><h3>${fmt(activeCustomersPeriod)}</h3><p>Active Buyers</p></div>
  </div>
  <h2> Top Selling Products <small>Ranked by units sold during the period</small></h2>
  <table>
    <thead><tr>
      <th style="width:60px">Rank</th>
      <th>Product Name</th>
      <th class="center">Units Sold</th>
      <th class="right">Revenue</th>
    </tr></thead>
    <tbody>${topProdRows || '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:20px">No product data for this period</td></tr>'}</tbody>
  </table>
  <h2> Top Customers — Purchase Breakdown <small>Sorted by period spend · includes all orders &amp; product slots</small></h2>
  ${custBlocks || '<p style="color:#aaa;text-align:center;padding:20px;font-style:italic">No purchase records found for this period</p>'}
  <div class="footer">NIKITHA ENTERPRISES &nbsp;|&nbsp; Confidential Analytics &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); setDownloading(false); }, 800);
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="rpt-container">
      <div className="rpt-loading">
        <RiLoader4Line className="rpt-spin" size={40} />
        <p>Loading reports...</p>
      </div>
    </div>
  );

  // ── Compute Top Customers ─────────────────────────────────────────────────
  const topSpender = topCustomers.length > 0 ? [...topCustomers].sort((a, b) => (Number(b.totalSpent) || 0) - (Number(a.totalSpent) || 0))[0] : null;
  const topRepeater = topCustomers.length > 0 ? [...topCustomers].sort((a, b) => (Number(b.orderCount) || 0) - (Number(a.orderCount) || 0))[0] : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="rpt-container">

      {/* ── HEADER ── */}
      <div className="rpt-header">
        <div className="rpt-header-left">
          <div className="rpt-icon-wrap"><RiFileChartLine /></div>
          <div>
            <h1 className="rpt-h1">Reports & <span>Analytics</span></h1>
            <p className="rpt-subtext">Complete store performance overview</p>
          </div>
        </div>
        <div className="rpt-header-actions">
          <div className="rpt-date-filters" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div className="date-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '10px', fontWeight: '800', color: '#868686', textTransform: 'uppercase', letterSpacing: '0.5px' }}>From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '12.5px',
                  outline: 'none',
                  background: '#fff',
                  fontFamily: 'inherit',
                  color: '#2d5a1b'
                }}
              />
            </div>
            <div className="date-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '10px', fontWeight: '800', color: '#868686', textTransform: 'uppercase', letterSpacing: '0.5px' }}>To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '12.5px',
                  outline: 'none',
                  background: '#fff',
                  fontFamily: 'inherit',
                  color: '#2d5a1b'
                }}
              />
            </div>
          </div>
          <div className="rpt-range-toggle">
            <button
              className={`rpt-toggle-btn${range === 'monthly' ? ' active' : ''}`}
              onClick={() => setRange('monthly')}
            >
              <RiCalendarLine /> Monthly
            </button>
            <button
              className={`rpt-toggle-btn${range === '7days' ? ' active' : ''}`}
              onClick={() => setRange('7days')}
            >
              <RiTimeLine /> Last 7 Days
            </button>
          </div>
          <button className="rpt-refresh-btn" onClick={fetchAll} title="Refresh">
            <RiRefreshLine />
          </button>
          <button className="rpt-pdf-btn" onClick={downloadPDF} disabled={downloading}>
            {downloading
              ? <><RiLoader4Line className="rpt-spin" /> Generating...</>
              : <><RiDownloadLine /> Download PDF</>}
          </button>
        </div>
      </div>

      {error && <div className="rpt-error">⚠ {error}</div>}

      {/* ── SUMMARY HIGHLIGHTS ── */}
      <div className="rpt-charts-row" style={{ marginBottom: '24px' }}>
        <div className="rpt-card" style={{ flex: 1, padding: '20px', background: 'linear-gradient(135deg, #f7faf4 0%, #eef5e8 100%)', border: '1px solid rgba(45,90,27,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#2d5a1b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              <RiTrophyLine />
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#1f3f12', fontSize: 16 }}>Top Customer by Revenue</h3>
              <p style={{ margin: 0, color: '#4a6b38', fontSize: 13 }}>Highest total purchase amount</p>
            </div>
          </div>
          {topSpender && Number(topSpender.totalSpent) > 0 ? (
            <div>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>{topSpender.name}</div>
              <div style={{ color: '#4b5563', fontSize: 14 }}>{topSpender.email} • {topSpender.phone}</div>
              <div style={{ marginTop: 8, display: 'inline-block', background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                Total Spent: ₹{fmt(topSpender.totalSpent)}
              </div>
            </div>
          ) : (
            <p style={{ color: '#9ca3af', fontStyle: 'italic', margin: '10px 0 0' }}>No purchase data available yet.</p>
          )}
        </div>

        <div className="rpt-card" style={{ flex: 1, padding: '20px', background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1px solid rgba(245,197,66,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f5c542', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              <RiUser3Line />
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#78350f', fontSize: 16 }}>Most Loyal Customer</h3>
              <p style={{ margin: 0, color: '#92400e', fontSize: 13 }}>Highest number of repeat orders</p>
            </div>
          </div>
          {topRepeater && Number(topRepeater.orderCount) > 0 ? (
            <div>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>{topRepeater.name}</div>
              <div style={{ color: '#4b5563', fontSize: 14 }}>{topRepeater.email} • {topRepeater.phone}</div>
              <div style={{ marginTop: 8, display: 'inline-block', background: '#fef08a', color: '#854d0e', padding: '4px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                Total Orders: {fmt(topRepeater.orderCount)} Orders
              </div>
            </div>
          ) : (
            <p style={{ color: '#9ca3af', fontStyle: 'italic', margin: '10px 0 0' }}>No order data available yet.</p>
          )}
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="rpt-stats-grid">
        <div className="rpt-stat gold" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/orders')}>
          <div className="rpt-stat-icon gold-icon"><RiMoneyDollarCircleLine /></div>
          <div>
            <p>Total Sales (Delivered)</p>
            <h2>₹{fmt(stats.totalSales)}</h2>
          </div>
          <RiArrowUpLine className="rpt-stat-trend" />
        </div>
        <div className="rpt-stat" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/orders')}>
          <div className="rpt-stat-icon navy-icon"><RiShoppingCartLine /></div>
          <div><p>Total Orders</p><h2>{fmt(stats.totalOrders)}</h2></div>
        </div>
        <div className="rpt-stat" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/customers')}>
          <div className="rpt-stat-icon teal-icon"><RiTeamLine /></div>
          <div><p>Registered Users</p><h2>{fmt(stats.totalRegistered)}</h2></div>
        </div>
        <div className="rpt-stat" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/customers')}>
          <div className="rpt-stat-icon purple-icon"><RiUser3Line /></div>
          <div><p>Active Customers</p><h2>{fmt(stats.totalCustomers)}</h2></div>
        </div>
        <div className="rpt-stat blue" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/orders?filter=today')}>
          <div className="rpt-stat-icon blue-icon"><RiTrophyLine /></div>
          <div><p>New Orders Today</p><h2>{fmt(stats.newOrdersToday)}</h2></div>
        </div>
        <div className="rpt-stat green" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/orders?status=Delivered&filter=today')}>
          <div className="rpt-stat-icon green-icon"><RiTruckLine /></div>
          <div><p>Today Deliveries</p><h2>{fmt(stats.deliveredToday)}</h2></div>
        </div>
      </div>

      {/* ── CHARTS ROW 1 ── */}
      <div className="rpt-charts-row">
        <div className="rpt-card">
          <div className="rpt-card-head">
            <div>
              <h3>Revenue <span className="rpt-badge-delivered">Delivered Orders</span></h3>
              <span className="rpt-card-sub">{range === '7days' ? 'Last 7 days' : 'All months'}</span>
            </div>
          </div>
          {displayRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={displayRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#d4af37" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,4,74,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9aabcc' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9aabcc' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone" dataKey="value" name="Revenue"
                  stroke="#d4af37" strokeWidth={2.5} fill="url(#revGrad)"
                  dot={{ r: 4, fill: '#d4af37', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#d4af37' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : <p className="rpt-empty">No revenue data</p>}
        </div>

        <div className="rpt-card">
          <div className="rpt-card-head">
            <div>
              <h3>Order Volume <span className="rpt-badge-all">All Orders</span></h3>
              <span className="rpt-card-sub">{range === '7days' ? 'Last 7 days' : 'By month'}</span>
            </div>
          </div>
          {displayOrders.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={displayOrders} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,4,74,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9aabcc' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9aabcc' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,4,74,0.04)' }} />
                <Bar dataKey="count" name="Orders" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {displayOrders.map((_, i) => (
                    <Cell key={i} fill={i === displayOrders.length - 1 ? '#d4af37' : 'rgba(0,4,74,0.18)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="rpt-empty">No order data</p>}
        </div>
      </div>

      {/* ── CHARTS ROW 2 ── */}
      <div className="rpt-charts-row">
        <div className="rpt-card">
          <div className="rpt-card-head">
            <h3>Order Status Distribution</h3>
          </div>
          {statusDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusDist} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                  paddingAngle={3}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {statusDist.map((s, i) => (
                    <Cell key={i} fill={STATUS_COLORS[s.name] || COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend
                  iconType="circle" iconSize={8}
                  formatter={v => <span style={{ fontSize: 11, color: '#9aabcc' }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="rpt-empty">No data</p>}
        </div>

        <div className="rpt-card">
          <div className="rpt-card-head">
            <div>
              <h3>New Registrations</h3>
              <span className="rpt-card-sub">Last 30 days — day wise</span>
            </div>
          </div>
          {newUsersDaily.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={newUsersDaily.map(d => ({
                  name:  new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
                  count: parseInt(d.count) || 0,
                }))}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,4,74,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9aabcc' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9aabcc' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone" dataKey="count" name="New Users"
                  stroke="#7c3aed" strokeWidth={2.5}
                  dot={{ r: 3, fill: '#7c3aed' }} activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="rpt-empty">No registration data yet</p>}
        </div>
      </div>

      {/* ── TOP PRODUCTS ── */}
      <div className="rpt-card-wide">
        <div className="rpt-card-head">
          <div>
            <h3>Top Selling Products</h3>
            <span className="rpt-card-sub">Units sold + revenue</span>
          </div>
          <RiShoppingBag3Line size={22} style={{ color: '#d4af37' }} />
        </div>
        {topProducts.length > 0 ? (
          <div className="rpt-prod-grid">
            {topProducts.map((p, i) => {
              const thumb   = getThumb(p.Product);
              const maxSold = parseInt(topProducts[0]?.totalSold) || 1;
              const pct     = ((parseInt(p.totalSold) || 0) / maxSold) * 100;
              const rankKey = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
              return (
                <div className="rpt-prod-row" key={i}>
                  <span className={`rpt-rank${rankKey ? ` ${rankKey}` : ''}`}>#{i + 1}</span>
                  <div className="rpt-prod-thumb-wrap">
                    {thumb
                      ? <img
                          src={IMG + thumb} alt={p.Product?.name}
                          className="rpt-prod-thumb"
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      : <div className="rpt-prod-thumb-fallback"><RiShoppingBag3Line /></div>}
                  </div>
                  <div className="rpt-prod-info">
                    <span className="rpt-prod-name">{p.Product?.name || 'Product'}</span>
                    <div className="rpt-bar-track">
                      <div className="rpt-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="rpt-prod-rev">Revenue: ₹{fmt(p.totalRevenue || 0)}</span>
                  </div>
                  <div className="rpt-prod-stats">
                    <span className="rpt-prod-sold-num">{parseInt(p.totalSold) || 0}</span>
                    <span className="rpt-prod-sold-label">units</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <p className="rpt-empty">No product sales data</p>}
      </div>

      {/* ── REVENUE TABLE ── */}
      <div className="rpt-card-wide">
        <div className="rpt-card-head">
          <h3>Revenue Breakdown — All Months</h3>
        </div>
        {revenueChart.length > 0 ? (
          <div className="rpt-rev-table-wrap">
            {revenueChart.map((d, i) => {
              const val      = parseFloat(d.val) || 0;
              const maxVal   = Math.max(...revenueChart.map(r => parseFloat(r.val) || 0), 1);
              const curMonth = new Date().getMonth();
              const isActive = parseInt(d.monthNum) - 1 === curMonth;
              const pct      = (val / maxVal) * 100;
              return (
                <div key={i} className="rpt-rev-row">
                  <span className={`rpt-rev-label${isActive ? ' active' : ''}`}>{d.month}</span>
                  <div className="rpt-rev-bar-track">
                    <div className={`rpt-rev-bar-fill${isActive ? ' active' : ''}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="rpt-rev-orders">{d.orderCount || 0} orders</span>
                  <span className="rpt-rev-val">₹{fmt(val)}</span>
                </div>
              );
            })}
          </div>
        ) : <p className="rpt-empty">No monthly data yet</p>}
      </div>

      {/* ── TOP CUSTOMERS BY SPEND ── */}
      <div className="rpt-card-wide">
        <div className="rpt-card-head">
          <div>
            <h3>Top Customers</h3>
            <span className="rpt-card-sub">Highest purchase value customers sorted by total spend</span>
          </div>
          <RiTeamLine size={22} style={{ color: '#d4af37' }} />
        </div>
        {topCustomers.length > 0 ? (
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead>
                <tr>
                  {['#', 'Customer', 'Total Spent', 'Orders', 'Joined', 'Highest Purchase', 'Action'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...topCustomers]
                  .sort((a, b) => parseFloat(b.totalSpent || 0) - parseFloat(a.totalSpent || 0))
                  .slice(0, 10)
                  .map((c, i) => {
                    const isSelected = selCustomer?.id === c.id;
                    const rankKey    = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
                    const totalSpent  = parseFloat(c.totalSpent || 0);
                    return (
                      <React.Fragment key={c.id || i}>
                        <tr
                          className={`rpt-tr${isSelected ? ' selected' : ''}`}
                        >
                          <td>
                            <span className={`rpt-rank-sm${rankKey ? ` ${rankKey}` : ''}`}>#{i + 1}</span>
                          </td>
                          <td className="rpt-cust-name">{c.name || '—'}</td>
                          <td className="rpt-cust-value">₹{fmt(totalSpent)}</td>
                          <td>{c.orderCount ?? 0}</td>
                          <td className="rpt-date-cell">
                            {c.createdAt
                              ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '—'}
                          </td>
                          <td>₹{fmt(c.highestPurchase || 0)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              onClick={() => loadCustomerOrders(c)}
                              style={{ padding: '6px 12px', fontSize: '11px', background: isSelected ? '#111827' : '#2d5a1b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                            >
                              {isSelected ? 'Close Details' : 'View Orders'}
                            </button>
                          </td>
                        </tr>

                        {isSelected && (
                          <tr>
                            <td colSpan={7} className="rpt-drilldown-cell">
                              <div className="rpt-drilldown">
                                <h4> Orders by {c.name}</h4>
                                {custLoading ? (
                                  <div style={{ textAlign: 'center', padding: '20px', color: '#9aabcc' }}>
                                    <RiLoader4Line className="rpt-spin" size={24} />
                                  </div>
                                ) : custOrders.length > 0 ? (
                                  <>
                                    <div className="rpt-cust-summary">
                                      <div className="rpt-cust-sum-item">
                                        <span className="rpt-cust-sum-label">Total Orders</span>
                                        <strong className="rpt-cust-sum-value">{custOrders.length}</strong>
                                      </div>
                                      <div className="rpt-cust-sum-item">
                                        <span className="rpt-cust-sum-label">Total Spent</span>
                                        <strong className="rpt-cust-sum-value gold">
                                          ₹{fmt(custOrders.reduce((s, o) => s + (parseFloat(o.totalAmount) || 0), 0))}
                                        </strong>
                                      </div>
                                      <div className="rpt-cust-sum-item">
                                        <span className="rpt-cust-sum-label">Delivered</span>
                                        <strong className="rpt-cust-sum-value green">
                                          {custOrders.filter(o => o.orderStatus === 'Delivered' || o.status === 'Delivered').length}
                                        </strong>
                                      </div>
                                      <div className="rpt-cust-sum-item">
                                        <span className="rpt-cust-sum-label">Cancelled</span>
                                        <strong className="rpt-cust-sum-value red">
                                          {custOrders.filter(o => o.orderStatus === 'Cancelled' || o.status === 'Cancelled').length}
                                        </strong>
                                      </div>
                                    </div>

                                    <table className="rpt-inner-table">
                                      <thead>
                                        <tr>
                                          {['Order ID', 'Amount', 'Discount', 'Payment', 'Status', 'Products', 'Date'].map(h => (
                                            <th key={h}>{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {custOrders.map((o) => {
                                          const oid         = o.orderId || o.id;
                                          const status      = o.orderStatus || o.status;
                                          const slots       = o.slots || o.items || [];
                                          const statusClass = status?.replace(/\s+/g, '-') || 'default';
                                          return (
                                            <tr key={oid}>
                                              <td className="rpt-order-id">#{oid}</td>
                                              <td className="rpt-order-amt">₹{fmt(o.totalAmount)}</td>
                                              <td>
                                                {parseFloat(o.discountAmount) > 0
                                                  ? <span className="rpt-disc-badge">-₹{fmt(o.discountAmount)}</span>
                                                  : '—'}
                                              </td>
                                              <td>{o.paymentMethod || '—'}</td>
                                              <td>
                                                <span className={`rpt-status ${statusClass}`}>{status}</span>
                                              </td>
                                              <td>
                                                {slots.map((sl, si) => (
                                                  <div key={si} className="rpt-prod-chip">
                                                    {sl.Product?.name || sl.productName || `#${sl.productId}`} ×{sl.quantity}
                                                    <span className="rpt-prod-chip-price">&nbsp;₹{fmt(sl.salesPrice)}</span>
                                                  </div>
                                                ))}
                                              </td>
                                              <td className="rpt-date-cell">
                                                {new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </>
                                ) : <p className="rpt-empty">No orders for this customer.</p>}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : <p className="rpt-empty">No customers found</p>}
      </div>

      {/* ── COURIER SETTLEMENT & SHIPPING REPORTS ── */}
      <div className="rpt-section" style={{ marginTop: '40px', paddingTop: '30px', borderTop: '2px dashed #e2e8f0' }}>
        <div className="rpt-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#111827', margin: 0 }}>
              🚚 Courier Shipping &amp; <span className="gold-text">Settlement Report</span>
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>Audit shipping costs and settlement status with courier partners</p>
          </div>

          <div className="rpt-range-toggle">
            <button
              className={`rpt-toggle-btn${settlementRange === 'weekly' ? ' active' : ''}`}
              onClick={() => setSettlementRange('weekly')}
            >
              Weekly
            </button>
            <button
              className={`rpt-toggle-btn${settlementRange === 'monthly' ? ' active' : ''}`}
              onClick={() => setSettlementRange('monthly')}
            >
              Monthly
            </button>
            <button
              className={`rpt-toggle-btn${settlementRange === 'yearly' ? ' active' : ''}`}
              onClick={() => setSettlementRange('yearly')}
            >
              Yearly
            </button>
          </div>
        </div>

        {/* Summary Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <div className="rpt-card" style={{ padding: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Shipped Orders</p>
            <h2 style={{ margin: '8px 0 0 0', fontSize: '28px', color: '#1e293b' }}>
              {courierOrders.length}
            </h2>
          </div>

          <div className="rpt-card" style={{ padding: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Shipping Cost (Owed)</p>
            <h2 style={{ margin: '8px 0 0 0', fontSize: '28px', color: '#1e293b' }}>
              ₹{courierSummary.reduce((sum, item) => sum + parseFloat(item.totalCost || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h2>
          </div>

          <div className="rpt-card" style={{ padding: '20px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#047857', fontWeight: 'bold', textTransform: 'uppercase' }}>Paid to Courier</p>
            <h2 style={{ margin: '8px 0 0 0', fontSize: '28px', color: '#065f46' }}>
              ₹{courierSummary.reduce((sum, item) => sum + parseFloat(item.totalPaid || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h2>
          </div>

          <div className="rpt-card" style={{ padding: '20px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#b91c1c', fontWeight: 'bold', textTransform: 'uppercase' }}>Outstanding Balance</p>
            <h2 style={{ margin: '8px 0 0 0', fontSize: '28px', color: '#991b1b' }}>
              ₹{courierSummary.reduce((sum, item) => sum + parseFloat(item.totalPending || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h2>
          </div>
        </div>

        {/* Courier Partner Breakdown Table */}
        <div className="rpt-card" style={{ padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', color: '#111827', margin: '0 0 15px 0' }}>Breakdown by Courier Partner</h3>
          <table className="rpt-table">
            <thead>
              <tr>
                <th>Courier Partner</th>
                <th>Orders Shipped</th>
                <th>Total Owed</th>
                <th>Total Paid</th>
                <th>Total Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {courierSummary.length > 0 ? (
                courierSummary.map((c, i) => (
                  <tr key={i}>
                    <td><strong>{c.courierPartner}</strong></td>
                    <td>{c.totalOrders}</td>
                    <td>₹{parseFloat(c.totalCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="green">₹{parseFloat(c.totalPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="red">₹{parseFloat(c.totalPending).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>No shipping history found for the selected period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Detailed Shipping Orders Audit List */}
        <div className="rpt-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', color: '#111827', margin: '0 0 15px 0' }}>Shipping Audit Log</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="rpt-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Courier Partner</th>
                  <th>AWB Code</th>
                  <th>Shipping Cost</th>
                  <th>Settlement Status</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {settlementLoading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                      <RiLoader4Line className="rpt-spin" size={24} />
                    </td>
                  </tr>
                ) : courierOrders.length > 0 ? (
                  courierOrders.map((o, idx) => (
                    <tr key={o.orderId || idx}>
                      <td><strong>#{o.orderId}</strong></td>
                      <td>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                      <td>{o.courierPartner}</td>
                      <td>{o.awb_code || 'N/A'}</td>
                      <td>₹{parseFloat(o.courierShippingCost || 0).toFixed(2)}</td>
                      <td>
                        <span style={{
                          padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                          backgroundColor: o.courierPaymentStatus === 'Paid' ? '#d1fae5' : '#fee2e2',
                          color: o.courierPaymentStatus === 'Paid' ? '#065f46' : '#991b1b',
                        }}>
                          {o.courierPaymentStatus === 'Paid' ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={async () => {
                            const newStatus = o.courierPaymentStatus === 'Paid' ? 'Unpaid' : 'Paid';
                            try {
                              const res = await axios.post(`${API}/orders/shipping/update-settlement`, {
                                orderIds: [o.orderId],
                                courierPaymentStatus: newStatus
                              });
                              if (res.data.success) {
                                toast.success('Status updated');
                                fetchCourierSettlements();
                              }
                            } catch (err) {
                              toast.error('Failed to update status');
                            }
                          }}
                          style={{
                            padding: '4px 8px', fontSize: '11px', background: '#2d5a1b', color: '#fff',
                            border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600
                          }}
                        >
                          Mark {o.courierPaymentStatus === 'Paid' ? 'Unpaid' : 'Paid'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>No shipped orders for this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}

