import React, { useState, useEffect } from "react";
import "./MyOrders.css";
import axios from "axios";
import { toast } from "react-toastify";
import { FiPackage, FiChevronDown, FiChevronUp, FiEdit2 } from "react-icons/fi";
import { API, IMG } from "../../config";
import OrderTrackingStepper from "../../components/OrderTrackingStepper/OrderTrackingStepper";

const SECTIONS = {
  ORDERS: "orders",
  REVIEWS: "reviews",
};

function formatPrice(value) {
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

function formatOrderDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function StatusBadge({ status }) {
  const cls = status?.toLowerCase().replace(/\s+/g, '-');
  return <span className={`order-card__status is-${cls}`}>{status}</span>;
}

function PaymentBadge({ method, paymentStatus }) {
  const isPaid = paymentStatus === 'Paid';
  return (
    <span className={`order-payment-badge ${isPaid ? 'is-paid' : 'is-pending'}`}>
      {method === 'COD' ? ' COD' : isPaid ? '✔ Paid Online' : ' Payment Pending'}
    </span>
  );
}

export default function MyOrders({ currentUser, onNavigate, initialTab = "orders" }) {
  const [activeSection, setActiveSection] = useState(initialTab);
  const [expandedId, setExpandedId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewModal, setReviewModal] = useState({ open: false, order: null, item: null, existing: null });
  const [reviewForm, setReviewForm] = useState({ rating: 5, feedback: '', images: [] });
  const [submitting, setSubmitting] = useState(false);
  const [companyState, setCompanyState] = useState('Tamil Nadu');
  const [cancelModal, setCancelModal] = useState({ open: false, orderId: null });
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelFlow, setCancelFlow] = useState(null); // { order, cancelType }
  const [cancelFormData, setCancelFormData] = useState({
    reasonCategory: '',
    reasonText: '',
    customerUpiId: '',
    refundMethod: 'SAME_ACCOUNT',
    images: [],
    video: null
  });
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [trackingMap, setTrackingMap] = useState({});

  useEffect(() => {
    fetch(`${API}/settings`).then(res => res.ok ? res.json() : null).then(data => {
      if (data?.success && data.data?.COMPANY_STATE) setCompanyState(data.data.COMPANY_STATE);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialTab && Object.values(SECTIONS).includes(initialTab)) {
      setActiveSection(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (!currentUser?.id || !currentUser?.token) return;
    setLoading(true);
    const fetchOrders = fetch(`${API}/orders/customer/${currentUser.id}`, {
      headers: { 'Authorization': `Bearer ${currentUser.token}` }
    }).then(res => res.ok ? res.json() : []);

    const fetchReviews = fetch(`${API}/reviews/customer/${currentUser.id}`, {
      headers: { 'Authorization': `Bearer ${currentUser.token}` }
    }).then(res => res.ok ? res.json() : []);

    Promise.all([fetchOrders, fetchReviews])
      .then(([oData, rData]) => {
        const list = Array.isArray(oData) ? oData : [];
        setOrders(list);
        setReviews(Array.isArray(rData) ? rData : []);
        if (list.length > 0) {
          const firstOrd = list[0];
          const firstKey = firstOrd.orderId || firstOrd.id;
          setExpandedId(firstKey);
          if (firstOrd.courierPartner || firstOrd.awb_code || firstOrd.tracking_url) {
            handleTrackOrder(firstOrd);
          }
        }
      })
      .catch(() => { setOrders([]); setReviews([]); })
      .finally(() => setLoading(false));
  }, [currentUser]);

  const openReviewModal = (item, order, existing = null) => {
    setReviewModal({ open: true, order, item, existing });
    setReviewForm(existing ? { rating: existing.rating, feedback: existing.feedback, images: [] } : { rating: 5, feedback: '', images: [] });
  };
  const closeReviewModal = () => {
    setReviewModal({ open: false, order: null, item: null, existing: null });
    setReviewForm({ rating: 5, feedback: '', images: [] });
  };
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData();
    formData.append('customerId', currentUser.id);
    formData.append('orderId', reviewModal.order.orderId || reviewModal.order.id);
    formData.append('productId', reviewModal.item.productId || reviewModal.item.id);
    formData.append('rating', reviewForm.rating);
    formData.append('feedback', reviewForm.feedback);
    if(reviewForm.images) {
      Array.from(reviewForm.images).forEach(f => formData.append('images', f));
    }
    try {
      const res = await fetch(`${API}/reviews/create`, { method: 'POST', body: formData });
      if(res.ok) {
        closeReviewModal();
        const rData = await fetch(`${API}/reviews/customer/${currentUser.id}`).then(r=>r.ok?r.json():[]);
        setReviews(Array.isArray(rData) ? rData : []);
        toast.success('Review submitted successfully! It will appear once approved.');
      } else {
        const err = await res.json();
        toast.error(err.message || 'Error submitting review');
      }
    } catch(err) { toast.error('Network error'); }
    setSubmitting(false);
  };
  const handleDeleteReview = async () => {
    try {
      const res = await fetch(`${API}/reviews/delete/${reviewModal.existing.id}`, { method: 'DELETE' });
      if(res.ok) {
        closeReviewModal();
        const rData = await fetch(`${API}/reviews/customer/${currentUser.id}`).then(r=>r.ok?r.json():[]);
        setReviews(Array.isArray(rData) ? rData : []);
        toast.success('Review deleted successfully.');
      } else {
        const error = await res.json().catch(() => ({}));
        toast.error(error.message || 'Unable to delete this review.');
      }
    } catch(err) { toast.error('Unable to delete this review.'); }
  };

  const requestDeleteReview = () => {
    let confirmationToastId;
    confirmationToastId = toast.warn(
      <div style={{ lineHeight: 1.45 }}>
        <strong>Delete this review?</strong>
        <p style={{ margin: '4px 0 10px', fontSize: 12 }}>This action cannot be undone.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => { toast.dismiss(confirmationToastId); handleDeleteReview(); }}
            style={{ border: 'none', borderRadius: 6, padding: '6px 12px', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => toast.dismiss(confirmationToastId)}
            style={{ border: 'none', borderRadius: 6, padding: '6px 12px', background: '#e5e7eb', color: '#374151', fontWeight: 600, cursor: 'pointer' }}
          >
            Keep review
          </button>
        </div>
      </div>,
      { autoClose: false, closeOnClick: false, closeButton: false, draggable: false }
    );
  };

  const handleCancelRequest = async (e) => {
    e.preventDefault();
    if (!cancelModal.orderId) return;
    setIsCancelling(true);
    try {
      const t = currentUser?.token || localStorage.getItem('at_token');
      const res = await axios.post(`${API}/orders/cancel-request/${cancelModal.orderId}`, { reason: cancelReason }, {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (res.data.success) {
        toast.success('Cancellation requested successfully');
        setCancelModal({ open: false, orderId: null });
        setCancelReason('');
        setOrders(prev => prev.map(o => o.orderId === cancelModal.orderId ? { ...o, cancellationStatus: 'Requested', cancellationReason: cancelReason } : o));
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to request cancellation');
    } finally {
      setIsCancelling(false);
    }
  };

  const getCancelType = (order) => {
    const status = String(order.orderStatus || order.status || 'Pending').trim().toLowerCase();
    if (order.cancellationStatus === 'Requested' || order.cancellationStatus === 'Approved' || status === 'cancelled') {
      return null;
    }
    if (status === 'pending' || status === 'confirmed' || status === 'processing') return 'PRE_DISPATCH';
    if (status === 'shipped' || status === 'out for delivery') return 'IN_TRANSIT';
    if (status === 'delivered') return 'POST_DELIVERY';
    return 'PRE_DISPATCH';
  };

  const openCancelFlow = (order) => {
    const cancelType = getCancelType(order);
    if (!cancelType) return toast.error('This order cannot be cancelled or returned');
    setCancelFlow({ order, cancelType });
    setCancelFormData({
      reasonCategory: '',
      reasonText: '',
      customerUpiId: '',
      refundMethod: order.paymentMethod === 'Online' ? 'SAME_ACCOUNT' : 'UPI',
      images: [],
      video: null
    });
  };

  const handleNewCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelFlow) return;
    const { order, cancelType } = cancelFlow;
    const isOnline = order.paymentMethod === 'Online';

    // Validate UPI ID if UPI option selected for refund
    if ((isOnline && cancelFormData.refundMethod === 'UPI') || (!isOnline && cancelType !== 'PRE_DISPATCH')) {
      if (!cancelFormData.customerUpiId && cancelType !== 'PRE_DISPATCH') {
        return toast.error('UPI ID is required for UPI refund option');
      }
    }

    setCancelSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('orderId', order.orderId || order.id);
      formData.append('cancelType', cancelType);
      formData.append('reasonCategory', cancelFormData.reasonCategory);
      formData.append('reasonText', cancelFormData.reasonText);
      formData.append('refundMethod', cancelFormData.refundMethod);
      if (cancelFormData.customerUpiId) formData.append('customerUpiId', cancelFormData.customerUpiId);
      if (cancelFormData.images) Array.from(cancelFormData.images).forEach(img => formData.append('images', img));
      if (cancelFormData.video) formData.append('video', cancelFormData.video);

      const res = await fetch(`${API}/cancellations/request`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      toast.success('Cancellation request submitted! Admin will review shortly.');
      setCancelFlow(null);
      // Refresh orders
      const oData = await fetch(`${API}/orders/customer/${currentUser.id}`, { headers: { Authorization: `Bearer ${currentUser.token}` } }).then(r => r.ok ? r.json() : []);
      setOrders(Array.isArray(oData) ? oData : []);
    } catch (err) {
      toast.error(err.message || 'Failed to submit cancellation');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handleTrackOrder = async (order) => {
    const orderId = order.orderId || order.id;
    const token = currentUser?.token || localStorage.getItem('at_token');
    setTrackingMap(prev => ({
      ...prev,
      [orderId]: { loading: true, data: prev[orderId]?.data || null, error: '' }
    }));

    try {
      const res = await fetch(`${API}/orders/shipping/tracking/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch tracking');
      }

      setTrackingMap(prev => ({
        ...prev,
        [orderId]: { loading: false, data, error: '' }
      }));
    } catch (err) {
      setTrackingMap(prev => ({
        ...prev,
        [orderId]: { loading: false, data: null, error: err.message || 'Failed to fetch tracking' }
      }));
    }
  };

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);

  const handleDownloadInvoice = (order, documentType = 'STANDARD') => {
    const win = window.open('', '_blank');
    const isGstInvoice = documentType === 'GST';
    
    const items = order.items || [];
    const orderId = order.orderId || order.id;
    const orderDate = order.createdAt 
      ? new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
      : order.date || '';
      
    let totalMRP = 0;
    let totalDiscount = 0;
    let totalTaxable = 0;
    let totalGst = 0;
    
    const itemsHtml = items.map((sl, idx) => {
      const mrp = parseFloat(sl.mrpPrice || sl.salesPrice || sl.price || 0);
      const price = parseFloat(sl.salesPrice || sl.price || 0);
      const quantity = parseInt(sl.quantity || 1);
      const lineTotal = price * quantity;
      const discount = Math.max(0, mrp - price);
      const lineDiscount = discount * quantity;
      const lineTaxable = Number(sl.basePrice ?? price) * quantity;
      const lineGst = Number(sl.gstAmount ?? 0) * quantity;
      
      totalMRP += mrp * quantity;
      totalDiscount += lineDiscount;
      totalTaxable += lineTaxable;
      totalGst += lineGst;
      
      const pImage = sl.productImage ? (sl.productImage.startsWith('http') ? sl.productImage : (IMG + '/' + sl.productImage.replace(/^\/+/, ''))) : (sl.thumb ? (sl.thumb.startsWith('http') ? sl.thumb : (IMG + '/' + sl.thumb.replace(/^\/+/, ''))) : null);
      
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              ${pImage ? `<img src="${pImage}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;border:1px solid #eee;flex-shrink:0" onError="this.style.display='none'"/>` : ''}
              <div>
                <div style="font-weight:700;color:#071C1F">${sl.productName || sl.name || 'Product'}</div>
                ${sl.variantLabel ? `<div style="font-size:11.5px;color:#475569;margin-top:2px;">${sl.variantLabel}</div>` : ''}
                ${isGstInvoice ? `<div style="font-size:11px;color:#868686;margin-top:2px;">${sl.gstType === 'exclude' ? 'GST Charged Extra' : 'Price Inclusive of GST'}${sl.gstPercent ? ` · GST ${sl.gstPercent}%` : ''}</div>` : ''}
              </div>
            </div>
          </td>
          <td class="right">₹${mrp.toLocaleString('en-IN')}</td>
          <td class="right text-red">${discount > 0 ? `-₹${discount.toLocaleString('en-IN')}` : '—'}</td>
          <td class="right">₹${price.toLocaleString('en-IN')}</td>
          <td class="center">${quantity}</td>
          <td class="right" style="font-weight:700">₹${lineTotal.toLocaleString('en-IN')}</td>
        </tr>
      `;
    }).join('');
    
    const finalDiscount = totalDiscount + parseFloat(order.discountAmount || 0);
    const deliveryCharge = parseFloat(order.shippingAmount || 0);
    
    const userName = currentUser?.name || order.shippingSnapshot?.snapName || order.shippingSnapshot?.name || '';
    const userPhone = currentUser?.phone || order.shippingSnapshot?.snapPhone || order.shippingSnapshot?.phone || '';
    const address = order.shippingSnapshot 
      ? [order.shippingSnapshot.snapAddressLine || order.shippingSnapshot.addressLine, order.shippingSnapshot.snapCity || order.shippingSnapshot.city, order.shippingSnapshot.snapState || order.shippingSnapshot.state, order.shippingSnapshot.snapPincode || order.shippingSnapshot.pincode].filter(Boolean).join(', ')
      : '';
    const billingName = isGstInvoice ? (order.businessName || userName) : userName;
    const billingAddress = isGstInvoice
      ? [order.billingAddress, order.billingState, order.billingPincode].filter(Boolean).join(', ')
      : address;
      
    const normalizeState = (value) => {
      const normalized = String(value || '').trim().toLowerCase().replace(/\./g, '');
      return normalized === 'tn' ? 'tamil nadu' : normalized;
    };
    const shipState = isGstInvoice
      ? order.billingState
      : (order.shippingSnapshot?.snapState || order.shippingSnapshot?.state || '');
    const isInterstate = shipState && normalizeState(shipState) !== normalizeState(companyState);
    const cgst = isInterstate ? 0 : totalGst / 2;
    const sgst = isInterstate ? 0 : totalGst / 2;
    
    const paymentMethod = order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment';
    const paymentStatus = order.paymentStatus || 'Pending';
    
    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${isGstInvoice ? 'GST Tax Invoice' : 'Invoice'} - NE-${orderId}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  @page { size: auto; margin: 0; }
  body{font-family:'Segoe UI',Arial,sans-serif;padding:15mm 20mm;color:#1a1a2e;background:#fff;font-size:13px;line-height:1.5}
  .invoice-header{display:flex;justify-content:space-between;border-bottom:3px solid #2d5a1b;padding-bottom:18px;margin-bottom:24px}
  .brand-wrap{display:flex;flex-direction:column;align-items:center;text-align:center;min-width:300px}
  .brand-title{font-family:Georgia,serif;font-size:30px;font-weight:700;color:#476C1B;text-transform:uppercase;letter-spacing:2px;line-height:1}
  .brand-tagline{font-size:10.5px;font-weight:700;color:#C89438;text-transform:uppercase;letter-spacing:4px;margin-top:6px}
  .brand-mark{font-size:10px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:1.5px;margin-top:3px}
  .company-info{font-size:11.5px;color:#7a8aaa;margin-top:8px;line-height:1.6}
  .invoice-details{text-align:right}
  .invoice-details h2{font-size:20px;font-weight:700;color:#111827;text-transform:uppercase;margin-bottom:6px}
  .invoice-details p{font-size:12px;color:#475569;margin-bottom:3px}
  .address-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px}
  .address-box{border:1.5px solid #e2e8f0;border-radius:10px;padding:16px}
  .address-box h3{font-size:11px;font-weight:800;color:#868686;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
  .address-box p{font-size:12.5px;color:#111827;margin-bottom:3px}
  .cust-name{font-size:14px;font-weight:800;color:#111827;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:28px}
  thead tr{background:#111827}
  th{color:#FFCC00;padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px;font-weight:700}
  td{padding:12px;border-bottom:1px solid #eef0f8;vertical-align:middle}
  .right{text-align:right}
  .center{text-align:center}
  .text-red{color:#2d5a1b;font-weight:600}
  .summary-wrap{display:flex;justify-content:flex-end}
  .summary-table{width:320px;border-collapse:collapse;font-size:12.5px}
  .summary-table td{padding:6px 12px;border:none;border-bottom:1px solid #eef0f8}
  .summary-table tr.grand-total td{font-weight:800;font-size:14px;color:#fff;background:#111827;border-radius:6px;border-bottom:none;padding:10px 12px}
  .summary-table tr.grand-total td span{color:#FFCC00}
  .footer{margin-top:40px;text-align:center;color:#aaa;font-size:10.5px;border-top:1px solid #eee;padding-top:14px}
  @media print{body{padding:15mm 20mm}}
</style></head><body>
  <div class="invoice-header">
    <div class="brand-wrap">
      <div class="brand-title">ANYRA'S TROVE</div>
      <div class="brand-tagline">PEOPLE FIRST</div>
      <div class="brand-mark">BY NIKITHA ENTERPRISES</div>
      <div class="company-info">
        11, 1st Main Rd, near CBD Hotel, ATR Layout,<br/>
        Bengaluru, Karnataka – 560017, India<br/>
        Email: nikitha9320@gmail.com | Phone: +91 96204 39696<br/>
        GSTIN: 33AAAAA1234A1Z
      </div>
    </div>
    <div class="invoice-details">
      <h2>${isGstInvoice ? 'GST TAX INVOICE' : 'INVOICE'}</h2>
      <p><strong>Invoice No:</strong> NE-INV-${orderId}</p>
      <p><strong>Date:</strong> ${orderDate}</p>
      <p><strong>Payment Mode:</strong> ${paymentMethod} (${paymentStatus})</p>
    </div>
  </div>

  <div class="address-grid">
    <div class="address-box">
      <h3>${isGstInvoice ? 'Business Billing Details' : 'Customer Billing Details'}</h3>
      <p class="cust-name">${String(billingName || 'Guest Customer').toUpperCase()}</p>
      <p><strong>Phone:</strong> ${userPhone}</p>
      ${isGstInvoice ? `<p><strong>GSTIN:</strong> ${order.businessGstin}</p><p><strong>Billing Address:</strong> ${billingAddress}</p>` : ''}
    </div>
    <div class="address-box">
      <h3>Shipping Address</h3>
      <p class="cust-name">${String(userName || 'Guest Customer').toUpperCase()}</p>
      <p><strong>Phone:</strong> ${userPhone}</p>
      <p><strong>Address:</strong> ${address}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th>Item Description</th>
        <th class="right" style="width:90px">MRP Price</th>
        <th class="right" style="width:80px">Savings</th>
        <th class="right" style="width:90px">Sales Price</th>
        <th class="center" style="width:50px">Qty</th>
        <th class="right" style="width:90px">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="summary-wrap">
    <table class="summary-table">
      ${isGstInvoice ? `<tr><td>Taxable Value</td><td class="right">₹${totalTaxable.toLocaleString('en-IN', {minimumFractionDigits:2})}</td></tr>` : ''}
      <tr><td style="color:#2d5a1b">Total Savings</td><td class="right text-red">-₹${finalDiscount.toLocaleString('en-IN', {minimumFractionDigits:2})}</td></tr>
      ${isGstInvoice && isInterstate 
        ? `<tr><td>IGST</td><td class="right">₹${totalGst.toLocaleString('en-IN', {minimumFractionDigits:2})}</td></tr>`
        : isGstInvoice ? `<tr><td>CGST</td><td class="right">₹${cgst.toLocaleString('en-IN', {minimumFractionDigits:2})}</td></tr>
           <tr><td>SGST</td><td class="right">₹${sgst.toLocaleString('en-IN', {minimumFractionDigits:2})}</td></tr>`
        : ''
      }
      ${deliveryCharge > 0 ? `<tr><td>Delivery Charge</td><td class="right">₹${deliveryCharge.toLocaleString('en-IN', {minimumFractionDigits:2})}</td></tr>` : `<tr><td>Delivery Charge</td><td class="right">Free</td></tr>`}
      <tr class="grand-total">
        <td>Grand <span>Total</span></td>
        <td class="right">₹${parseFloat(order.totalAmount || order.total || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
      </tr>
    </table>
  </div>
  
  <div class="footer">
    Thank you for your business! This is a computer-generated document, no signature required.<br/>
    For support, email nikitha9320@gmail.com or call +91 96204 39696
  </div>
  
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    }
  </script>
</body></html>`);
    win.document.close();
  };

  const renderAnimatedTitle = (title) =>
    title.split("").map((char, idx) => (
      <span key={idx} className="hero-title__letter" style={{ animationDelay: `${idx * 0.06}s` }}>
        {char === " " ? "\u00A0" : char}
      </span>
    ));

  return (
    <div className="orders-page">
      {/* Page Hero Header */}
      <div className="page-hero" style={{ backgroundImage: `url('/herobanner.png')` }}>
        <div className="page-hero__overlay" />
        <div className="page-hero__content">
          <h1 className="hero-title">{renderAnimatedTitle("My Orders")}</h1>
          <nav className="page-hero__crumbs" aria-label="Breadcrumb">
            <span>Home</span>
            <span className="page-hero__crumb-sep">›</span>
            <span className="is-active">Orders</span>
          </nav>
        </div>
      </div>

      <div className="orders-section-container">
        <div className="orders-body">
          {/* Left Sidebar */}
          <aside className="orders-sidebar">
            <div className="orders-sidebar__head">
              <div className="orders-sidebar__icon-container"><FiPackage /></div>
              <h2>Purchases</h2>
            </div>
            <nav className="orders-nav">
              <button
                type="button"
                className={"orders-nav__item" + (activeSection === SECTIONS.ORDERS ? " is-active" : "")}
                onClick={() => setActiveSection(SECTIONS.ORDERS)}
              >
                <FiPackage />
                <span>Your Orders</span>
              </button>
              <button
                type="button"
                className={"orders-nav__item" + (activeSection === SECTIONS.REVIEWS ? " is-active" : "")}
                onClick={() => setActiveSection(SECTIONS.REVIEWS)}
              >
                <FiEdit2 />
                <span>Your Reviews</span>
              </button>
            </nav>
          </aside>

          {/* Right Panel */}
          <main className="orders-panel">
            {activeSection === SECTIONS.ORDERS && (
              <>
                <div className="orders-panel__head">
                  <div className="orders-panel__icon"><FiPackage /></div>
                  <h2>Order History</h2>
                </div>
                <div className="orders-panel__divider" />

                {loading ? (
                  <div className="orders-empty"><p>Loading your orders…</p></div>
                ) : !currentUser ? (
                  <div className="orders-empty">
                    <p>Please log in to view your orders.</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="orders-empty">
                    <p>You haven&apos;t placed any orders yet.</p>
                    <button type="button" className="orders-btn--primary" onClick={() => onNavigate && onNavigate("shop")}>
                      Start shopping <span>›</span>
                    </button>
                  </div>
                ) : (
                  <div className="orders-list">
                    {orders.map((order) => {
                      const isExpanded = expandedId === order.orderId || expandedId === order.id;
                      const ordKey = order.orderId || order.id;
                      const items = order.items || [];
                      const snap = order.shippingSnapshot;

                      return (
                        <div className="order-card" key={ordKey}>
                          <button
                            type="button"
                            className="order-card__summary"
                            onClick={() => toggleExpand(ordKey)}
                            aria-expanded={isExpanded}
                          >
                            <div className="order-card__info">
                              <span className="order-card__id">Order NE-{ordKey}</span>
                              <span className="order-card__date">
                                {order.createdAt ? formatOrderDate(order.createdAt) : order.date || ''}
                              </span>
                            </div>
                            <StatusBadge status={order.orderStatus || order.status || 'Pending'} />
                            <PaymentBadge method={order.paymentMethod} paymentStatus={order.paymentStatus} />
                            <span className="order-card__total">{formatPrice(order.totalAmount || order.total || 0)}</span>
                            <span className="order-card__chevron">
                              {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="order-card__detail">
                              <div className="order-items">
                                {items.map((item, idx) => {
                                  const imgSrc = item.productImage
                                    ? (item.productImage.startsWith('http') ? item.productImage : `${IMG}/${item.productImage}`)
                                    : item.thumb || '';
                                  return (
                                    <div className="order-item" key={item.productId || idx}>
                                      {imgSrc && <img src={imgSrc} alt={item.productName || item.name} />}
                                      <div className="order-item__info">
                                        <p className="order-item__name">{item.productName || item.name}</p>
                                        {item.variantLabel && <p className="order-item__variant">{item.variantLabel}</p>}
                                        <p className="order-item__qty">Qty: {item.quantity}</p>
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                        <span className="order-item__price">{formatPrice((item.salesPrice || item.price || 0) * (item.quantity || 1))}</span>
                                        { (order.orderStatus || order.status) === 'Delivered' && (() => {
                                            const existingReview = reviews.find(r => r.orderId === (order.orderId || order.id) && r.productId === (item.productId || item.id));
                                            return existingReview ? (
                                              <button type="button" className="orders-btn--secondary" style={{ padding: '6px 12px', fontSize: '13px', whiteSpace: 'nowrap' }} onClick={(e) => { e.stopPropagation(); openReviewModal(item, order, existingReview); }}>
                                                View Review
                                              </button>
                                            ) : (
                                              <button type="button" className="orders-btn--primary" style={{ padding: '6px 12px', fontSize: '13px', whiteSpace: 'nowrap' }} onClick={(e) => { e.stopPropagation(); openReviewModal(item, order); }}>
                                                Add Review
                                              </button>
                                            );
                                        })()}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="order-card__footer-info">
                                {snap && (
                                  <p>
                                    <strong>Shipping Address:</strong>{' '}
                                    {[snap.snapAddressLine || snap.addressLine, snap.snapCity || snap.city, snap.snapState || snap.state, snap.snapPincode || snap.pincode]
                                      .filter(Boolean)
                                      .join(', ')}
                                  </p>
                                )}
                                <p>
                                  <strong>Payment:</strong>{' '}
                                  {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment'}
                                  {' — '}
                                  <span style={{ color: order.paymentStatus === 'Paid' ? '#137333' : '#7a5800' }}>
                                    {order.paymentStatus || 'Pending'}
                                  </span>
                                </p>
                                {order.shippingAmount > 0 && (
                                  <p><strong>Shipping Charge:</strong> {formatPrice(order.shippingAmount)}</p>
                                )}
                                {order.discountAmount > 0 && (
                                  <p><strong>Discount:</strong> -{formatPrice(order.discountAmount)}</p>
                                )}
                                {order.invoiceType === 'BUSINESS_GST' && (
                                  <p style={{ color: '#166534' }}>
                                    <strong>GST Invoice:</strong> {order.businessName} · {order.businessGstin}
                                  </p>
                                )}
                                <p><strong>Total:</strong> {formatPrice(order.totalAmount || 0)}</p>
                                {order.orderStatus !== 'Cancelled' && (
                                  <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    <button
                                      type="button"
                                      className="orders-btn--primary"
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '13px' }}
                                      onClick={() => handleDownloadInvoice(order, 'STANDARD')}
                                    >
                                      Download Invoice
                                    </button>
                                    {order.invoiceType === 'BUSINESS_GST' && (
                                      <button
                                        type="button"
                                        className="orders-btn--secondary"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '13px' }}
                                        onClick={() => handleDownloadInvoice(order, 'GST')}
                                      >
                                        Download GST Invoice
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Stage-by-Stage Flipkart / Amazon Style Tracking Stepper */}
                                {(order.courierPartner || order.awb_code || trackingMap[ordKey]?.data) && (
                                  <OrderTrackingStepper 
                                    order={order} 
                                    trackingData={trackingMap[ordKey]?.data} 
                                  />
                                )}

                                {trackingMap[ordKey]?.error && (
                                  <p className="tracking-error">{trackingMap[ordKey].error}</p>
                                )}
                                
                                {order.cancellationStatus === 'Completed' && (
                                  <div style={{ background: '#dcfce7', color: '#15803d', padding: '8px 12px', borderRadius: '6px', fontWeight: '700', marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    ✅ Refund Completed
                                  </div>
                                )}
                                {order.cancellationStatus === 'Rejected' && (
                                  <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '8px 12px', borderRadius: '6px', fontWeight: '700', marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    ❌ Cancel/Return Rejected
                                  </div>
                                )}
                                
                                {/* Cancel / Return Button */}
                                {(() => {
                                  const ct = getCancelType(order);
                                  if (!ct) return null;
                                  const existingCancel = order.cancellationStatus;
                                  if (existingCancel === 'Requested' || existingCancel === 'Approved') {
                                    return <span className="order-cancel-status">{existingCancel === 'Requested' ? ' Cancel Requested' : ' Cancel Approved'}</span>;
                                  }
                                  return (
                                    <button
                                      className={`order-cancel-btn ${ct === 'POST_DELIVERY' ? 'return' : 'cancel'}`}
                                      onClick={() => openCancelFlow(order)}
                                    >
                                      {ct === 'POST_DELIVERY' ? ' Return / Refund' : ' Cancel Order'}
                                    </button>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {activeSection === SECTIONS.REVIEWS && (
              <>
                <div className="orders-panel__head">
                  <div className="orders-panel__icon"><FiEdit2 /></div>
                  <h2>Your Reviews</h2>
                </div>
                <div className="orders-panel__divider" />
                {reviews.length === 0 ? (
                  <div className="orders-empty">
                    <p>You haven't written any reviews yet.</p>
                    <p style={{ fontSize: '13.5px', color: '#777777', marginTop: '-12px', marginBottom: '20px' }}>
                      Once you receive your orders, you can write reviews for the items here.
                    </p>
                    <button type="button" className="orders-btn--primary" onClick={() => onNavigate && onNavigate("shop")}>
                      Browse Products <span>›</span>
                    </button>
                  </div>
                ) : (
                  <div className="reviews-grid-list">
                    {reviews.map(r => (
                      <div className="my-review-card" key={r.id}>
                        <div className="my-review-card__header">
                          <h4 className="my-review-card__title">{r.productInfo?.name || 'Product Review'}</h4>
                          <StatusBadge status={r.status === 'published' ? 'Approved' : r.status === 'rejected' ? 'Rejected' : 'Pending'} />
                        </div>
                        <div className="my-review-card__stars">
                          {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                        </div>
                        <p className="my-review-card__feedback">{r.feedback}</p>
                        {r.images && (() => {
                           try {
                             const imgs = JSON.parse(r.images);
                             return imgs.length > 0 && (
                               <div className="my-review-card__images">
                                 {imgs.map((img, i) => (
                                   <div className="my-review-card__img-wrapper" key={i}>
                                     <a href={`${IMG}/${img}`} target="_blank" rel="noopener noreferrer">
                                       <img src={`${IMG}/${img}`} alt="Review attachment" />
                                     </a>
                                   </div>
                                 ))}
                               </div>
                             );
                           } catch(e) { return null; }
                        })()}
                        <div className="my-review-card__footer">
                          <span className="my-review-card__date">
                            Submitted on {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <button type="button" className="orders-btn--secondary" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={() => openReviewModal(r.productInfo, null, r)}>
                            View / Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* ── Cancel Flow Modal ── */}
      {cancelFlow && (
        <div className="cancel-modal-overlay" onClick={() => setCancelFlow(null)}>
          <div className="cancel-modal" onClick={e => e.stopPropagation()}>
            <button className="cancel-modal-close" onClick={() => setCancelFlow(null)}>✕</button>

            <div className={`cancel-modal-type ${cancelFlow.cancelType.toLowerCase()}`}>
              {cancelFlow.cancelType === 'PRE_DISPATCH' && ' Cancel Order'}
              {cancelFlow.cancelType === 'IN_TRANSIT' && ' Cancel In-Transit'}
              {cancelFlow.cancelType === 'POST_DELIVERY' && ' Return & Refund'}
            </div>

            <h3>Order NE-{cancelFlow.order.orderId}</h3>
            <p className="cancel-modal-sub">
              {cancelFlow.cancelType === 'PRE_DISPATCH' && 'Your order has not been shipped yet. Cancellation will be processed immediately.'}
              {cancelFlow.cancelType === 'IN_TRANSIT' && 'Your order is on its way. A return pickup will be arranged after approval.'}
              {cancelFlow.cancelType === 'POST_DELIVERY' && 'Return request within 7 days of delivery. Upload photos and provide UPI ID for refund.'}
            </p>

            <form onSubmit={handleNewCancelSubmit} className="cancel-modal-form">

              {/* Reason Category */}
              <label className="cancel-form-label">Reason</label>
              <select
                className="cancel-form-input"
                value={cancelFormData.reasonCategory}
                onChange={e => setCancelFormData(p => ({ ...p, reasonCategory: e.target.value }))}
                required
              >
                <option value="">-- Select Reason --</option>
                {cancelFlow.cancelType === 'POST_DELIVERY' ? (
                  <>
                    <option>Color Issue</option>
                    <option>Quality Issue</option>
                    <option>Product Damaged</option>
                    <option>Wrong Product Delivered</option>
                    <option>Size Issue</option>
                    <option>Product Not As Described</option>
                    <option>Missing Parts</option>
                    <option>Other</option>
                  </>
                ) : (
                  <>
                    <option>Changed my mind</option>
                    <option>Ordered by mistake</option>
                    <option>Found better price elsewhere</option>
                    <option>Shipping too slow</option>
                    <option>Financial reasons</option>
                    <option>Other</option>
                  </>
                )}
              </select>

              {/* Reason Text */}
              <label className="cancel-form-label">Additional Details (optional)</label>
              <textarea
                className="cancel-form-input"
                rows={3}
                placeholder="Describe the issue..."
                value={cancelFormData.reasonText}
                onChange={e => setCancelFormData(p => ({ ...p, reasonText: e.target.value }))}
              />

              {/* Image & Video Upload - for POST_DELIVERY */}
              {cancelFlow.cancelType === 'POST_DELIVERY' && (
                <>
                  <label className="cancel-form-label"> Product Photos (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="cancel-form-file"
                    onChange={e => setCancelFormData(p => ({ ...p, images: e.target.files }))}
                  />

                  <label className="cancel-form-label"> Defect Video (Optional)</label>
                  <input
                    type="file"
                    accept="video/*"
                    className="cancel-form-file"
                    onChange={e => setCancelFormData(p => ({ ...p, video: e.target.files[0] || null }))}
                  />
                </>
              )}

              {/* Refund Method selection for Online Payments */}
              {cancelFlow.order.paymentMethod === 'Online' && (
                <div style={{ marginTop: '14px', marginBottom: '14px' }}>
                  <label className="cancel-form-label"> Select Refund Method</label>
                  <div style={{ display: 'flex', gap: '16px', margin: '8px 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                      <input
                        type="radio"
                        name="refundMethod"
                        value="SAME_ACCOUNT"
                        checked={cancelFormData.refundMethod === 'SAME_ACCOUNT'}
                        onChange={() => setCancelFormData(p => ({ ...p, refundMethod: 'SAME_ACCOUNT' }))}
                      />
                      Original Payment Source (Same Account)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                      <input
                        type="radio"
                        name="refundMethod"
                        value="UPI"
                        checked={cancelFormData.refundMethod === 'UPI'}
                        onChange={() => setCancelFormData(p => ({ ...p, refundMethod: 'UPI' }))}
                      />
                      UPI ID
                    </label>
                  </div>

                  {cancelFormData.refundMethod === 'UPI' && (
                    <>
                      <input
                        type="text"
                        className="cancel-form-input"
                        placeholder="yourname@upi or 9999999999@upi"
                        value={cancelFormData.customerUpiId}
                        onChange={e => setCancelFormData(p => ({ ...p, customerUpiId: e.target.value }))}
                        required
                      />
                      <p className="cancel-upi-note">Refund of ₹{Number(cancelFlow.order.totalAmount).toLocaleString('en-IN')} will be sent to this UPI ID after admin approval.</p>
                    </>
                  )}
                  {cancelFormData.refundMethod === 'SAME_ACCOUNT' && (
                    <p className="cancel-upi-note">Refund of ₹{Number(cancelFlow.order.totalAmount).toLocaleString('en-IN')} will be credited back to your original payment card/bank account.</p>
                  )}
                </div>
              )}

              {/* COD Return Refund UPI ID */}
              {cancelFlow.order.paymentMethod === 'COD' && cancelFlow.cancelType !== 'PRE_DISPATCH' && (
                <div style={{ marginTop: '14px', marginBottom: '14px' }}>
                  <label className="cancel-form-label"> Enter Your UPI ID (to receive refund for COD return)</label>
                  <input
                    type="text"
                    className="cancel-form-input"
                    placeholder="yourname@upi or 9999999999@upi"
                    value={cancelFormData.customerUpiId}
                    onChange={e => setCancelFormData(p => ({ ...p, customerUpiId: e.target.value }))}
                    required
                  />
                </div>
              )}

              <button type="submit" className="cancel-submit-btn" disabled={cancelSubmitting}>
                {cancelSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal.open && (
        <div className="review-modal-backdrop" onClick={closeReviewModal}>
          <div className="review-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="review-modal-header">
              <h3>{reviewModal.existing ? 'Review Details' : 'Write a Review'}</h3>
              <button type="button" className="review-modal-close" onClick={closeReviewModal}>×</button>
            </div>
            
            <form onSubmit={handleReviewSubmit}>
              <div className="review-form-group">
                <label>Rating</label>
                {reviewModal.existing ? (
                  <div className="my-review-card__stars" style={{ fontSize: '24px' }}>
                    {'★'.repeat(reviewModal.existing.rating)}{'☆'.repeat(5 - reviewModal.existing.rating)}
                  </div>
                ) : (
                  <div className="star-rating-selector">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <span
                        key={num}
                        onClick={() => setReviewForm({ ...reviewForm, rating: num })}
                        style={{
                          color: num <= reviewForm.rating ? '#c8a84b' : '#ddd',
                          transition: 'color 0.2s'
                        }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="review-form-group">
                <label>Feedback</label>
                {reviewModal.existing ? (
                  <p style={{ margin: 0, fontSize: '14.5px', background: '#fcfbf7', padding: '14px', borderRadius: '6px', border: '1px solid var(--line)', color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                    {reviewModal.existing.feedback}
                  </p>
                ) : (
                  <textarea
                    required
                    value={reviewForm.feedback}
                    onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })}
                    rows={4}
                    placeholder="Share your honest feedback about this product..."
                  />
                )}
              </div>

              {reviewModal.existing ? (
                reviewModal.existing.images && (() => {
                  try {
                    const imgs = JSON.parse(reviewModal.existing.images);
                    return imgs.length > 0 ? (
                      <div className="review-form-group">
                        <label>Attached Images</label>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                          {imgs.map((img, i) => (
                            <a href={`${IMG}/${img}`} target="_blank" rel="noopener noreferrer" key={i}>
                              <img src={`${IMG}/${img}`} alt="attachment" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--line)' }} />
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  } catch(e) { return null; }
                })()
              ) : (
                <div className="review-form-group">
                  <label>Add Images (Optional, Max 3)</label>
                  <div className="review-file-input-wrapper">
                    <span>📷 Click here or drag to upload photos</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files).slice(0, 3);
                        setReviewForm({ ...reviewForm, images: files });
                      }}
                    />
                  </div>
                  
                  {/* Selected Previews with Remove Button */}
                  {reviewForm.images && reviewForm.images.length > 0 && (
                    <div className="review-image-previews">
                      {Array.from(reviewForm.images).map((file, idx) => (
                        <div className="review-preview-item" key={idx}>
                          <img src={URL.createObjectURL(file)} alt="selected preview" />
                          <button
                            type="button"
                            className="review-preview-remove"
                            onClick={() => {
                              const updated = Array.from(reviewForm.images).filter((_, i) => i !== idx);
                              setReviewForm({ ...reviewForm, images: updated });
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                {reviewModal.existing ? (
                  <button type="button" onClick={requestDeleteReview} className="orders-btn--secondary" style={{ color: '#d93025', borderColor: '#d93025' }}>
                    Delete Review
                  </button>
                ) : (
                  <button type="submit" disabled={submitting} className="orders-btn--primary" style={{ width: '100%', justifyContent: 'center' }}>
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
