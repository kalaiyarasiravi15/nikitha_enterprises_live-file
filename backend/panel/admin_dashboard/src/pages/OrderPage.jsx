import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  RiEyeLine, RiDeleteBin6Line,
  RiArrowLeftSLine, RiArrowRightSLine, 
  RiFileList3Line, RiCloseLine, RiMapPinLine,
  RiTimeLine, RiShoppingBag3Line, RiUserLine,
  RiCalendarCheckLine, RiDownloadLine, RiFilter3Line
} from "react-icons/ri";
import './OrderPage.css';
import "./ReviewPage.css";
import { API, IMG } from '../config';
import OrderTrackingStepper from '../components/OrderTrackingStepper/OrderTrackingStepper';
import AdminPagination from '../components/AdminPagination';

const ORDERS_PER_PAGE = 10;   // ← single source of truth




const getShipping = (order) => {
  if (order.shippingSnapshot) return order.shippingSnapshot;
  const s = order.orderShipping;
  if (s) {
    return {
      name:        s.name        || order.Customer?.name  || 'Guest',
      phone:       s.phone       || order.Customer?.phone || null,
      addressLine: s.addressLine || null,
      city:        s.city        || null,
      district:    s.district    || null,
      state:       s.state       || null,
      pincode:     s.pincode     || null,
    };
  }
  const addr = order.Customer?.CustomerAddresses?.[0];
  if (addr) {
    return {
      name:        order.Customer?.name  || 'Guest',
      phone:       order.Customer?.phone || null,
      addressLine: [addr.houseNo, addr.street].filter(Boolean).join(', '),
      city:        addr.city     || null,
      district:    addr.district || null,
      state:       addr.state    || null,
      pincode:     addr.pincode  || null,
    };
  }
  return null;
};

const getShippingAddressStr = (order) => {
  const s = getShipping(order);
  if (!s) return null;
  const parts = [s.name, s.phone, s.addressLine, s.city, s.district, s.state, s.pincode].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
};

/* ══════════════════════════════════════════════════════
   PRINT GENERATORS
══════════════════════════════════════════════════════ */
const printTodayOrdersHTML = (orders) => {
  const win = window.open('', '_blank');
  
  const totalAmount = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0);
  const statusCounts = {};
  orders.forEach(o => {
    statusCounts[o.orderStatus] = (statusCounts[o.orderStatus] || 0) + 1;
  });
  
  const orderRows = orders.map((o, idx) => {
    const slots = o.slots || [];
    const itemsText = slots.map(sl => `${sl.Product?.name || sl.productName || `#${sl.productId}`} (×${sl.quantity})`).join(', ');
    return `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>#${o.orderId}</strong></td>
        <td>
          <div style="font-weight:600;color:#2d5a1b">${o.Customer?.name || 'Guest Customer'}</div>
          <div style="font-size:11px;color:#868686">${o.Customer?.phone || '—'}</div>
        </td>
        <td>${new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
        <td>${o.paymentMethod || '—'}</td>
        <td><span class="badge ${o.orderStatus?.toLowerCase().replace(/\s+/g, '-')}">${o.orderStatus}</span></td>
        <td style="max-width:300px;font-size:11.5px;color:#475569">${itemsText || '—'}</td>
        <td class="right" style="font-weight:700">₹${Number(o.totalAmount).toLocaleString('en-IN')}</td>
      </tr>
    `;
  }).join('');

  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Anyra's Trove — Today's Orders</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;padding:36px 40px;color:#1a1a2e;background:#fff;font-size:13px}
  .header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #2d5a1b;padding-bottom:14px;margin-bottom:20px}
  .brand-wrap{display:flex;flex-direction:column;align-items:center;text-align:center;min-width:280px}
  .title{font-family:Georgia,serif;font-size:25px;font-weight:700;color:#476C1B;text-transform:uppercase;letter-spacing:2px;line-height:1}
  .tagline{font-size:9px;font-weight:700;color:#C89438;text-transform:uppercase;letter-spacing:3.5px;margin-top:5px}
  .brand-mark{font-size:9px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:1.2px;margin-top:2px}
  .meta{font-size:11px;color:#7a8aaa;text-align:right;line-height:1.7}
  .stats-strip{display:flex;gap:12px;margin-bottom:24px}
  .stat-box{flex:1;background:#f8f9fa;border-left:4px solid #2d5a1b;border-radius:8px;padding:12px 14px;box-shadow:0 2px 4px rgba(0,0,0,0.02)}
  .stat-box h3{font-size:19px;color:#111827;font-weight:700}
  .stat-box p{font-size:9px;color:#7a8aaa;text-transform:uppercase;letter-spacing:.5px;margin-top:3px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}
  thead tr{background:#111827}
  th{color:#FFCC00;padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px;font-weight:600}
  td{padding:10px 12px;border-bottom:1px solid #eef0f8;vertical-align:middle}
  tr:nth-child(even) td{background:#f8f9ff}
  tr:last-child td{border-bottom:none}
  .right{text-align:right}
  .badge{display:inline-block;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;white-space:nowrap}
  .badge.delivered{background:#e8f5e9;color:#15803d}
  .badge.pending{background:#fff8e1;color:#b45309}
  .badge.cancelled{background:#ffebee;color:#c62828}
  .badge.shipped{background:#e3f2fd;color:#1565c0}
  .badge.confirmed{background:#e8eaf6;color:#283593}
  .badge.out-for-delivery{background:#e0f2f1;color:#00695c}
  .footer{margin-top:36px;text-align:center;color:#aaa;font-size:10px;border-top:1px solid #eee;padding-top:12px}
  @media print{body{padding:18px 22px}}
</style></head><body>
  <div class="header">
    <div class="brand-wrap">
      <div class="title">ANYRA'S TROVE</div>
      <div class="tagline">PEOPLE FIRST</div>
      <div class="brand-mark">BY NIKITHA ENTERPRISES</div>
      <div class="muted" style="margin-top:7px;font-size:11px">Today's Orders Audit &amp; Dispatch Report</div>
    </div>
    <div class="meta">Date: ${new Date().toLocaleDateString('en-IN')}<br/>Time: ${new Date().toLocaleTimeString('en-IN')}</div>
  </div>
  <div class="stats-strip">
    <div class="stat-box"><h3>${orders.length}</h3><p>Total Orders</p></div>
    <div class="stat-box"><h3>₹${totalAmount.toLocaleString('en-IN')}</h3><p>Total Value</p></div>
    <div class="stat-box"><h3>${statusCounts['Delivered'] || 0}</h3><p>Delivered</p></div>
    <div class="stat-box"><h3>${statusCounts['Pending'] || 0}</h3><p>Pending</p></div>
    <div class="stat-box"><h3>${statusCounts['Cancelled'] || 0}</h3><p>Cancelled</p></div>
  </div>
  <table>
    <thead><tr>
      <th style="width:40px">#</th>
      <th>Order ID</th>
      <th>Customer</th>
      <th>Date</th>
      <th>Payment</th>
      <th>Status</th>
      <th>Items Summary</th>
      <th class="right">Total</th>
    </tr></thead>
    <tbody>${orderRows}</tbody>
  </table>
  <div class="footer">ANYRA'S TROVE &nbsp;|&nbsp; Today's Orders Report &nbsp;|&nbsp; Generated automatically by Admin Portal</div>
</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); win.close(); }, 800);
};

const printFilteredOrdersHTML = (orders, startDate, endDate) => {
  const win = window.open('', '_blank');
  
  const totalAmount = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0);
  const statusCounts = {};
  orders.forEach(o => {
    statusCounts[o.orderStatus] = (statusCounts[o.orderStatus] || 0) + 1;
  });
  
  const orderRows = orders.map((o, idx) => {
    const slots = o.slots || [];
    const itemsText = slots.map(sl => `${sl.Product?.name || sl.productName || `#${sl.productId}`} (×${sl.quantity})`).join(', ');
    return `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>#${o.orderId}</strong></td>
        <td>
          <div style="font-weight:600;color:#2d5a1b">${o.Customer?.name || 'Guest Customer'}</div>
          <div style="font-size:11px;color:#868686">${o.Customer?.phone || '—'}</div>
        </td>
        <td>${new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
        <td>${o.paymentMethod || '—'}</td>
        <td><span class="badge ${o.orderStatus?.toLowerCase().replace(/\s+/g, '-')}">${o.orderStatus}</span></td>
        <td style="max-width:300px;font-size:11.5px;color:#475569">${itemsText || '—'}</td>
        <td class="right" style="font-weight:700">₹${Number(o.totalAmount).toLocaleString('en-IN')}</td>
      </tr>
    `;
  }).join('');

  let titleExtra = startDate && endDate ? `(${startDate} to ${endDate})` : (startDate ? `(From ${startDate})` : (endDate ? `(Until ${endDate})` : ''));

  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Filtered Orders Report</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;padding:36px 40px;color:#1a1a2e;background:#fff;font-size:13px}
  .header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #2d5a1b;padding-bottom:14px;margin-bottom:20px}
  .brand-wrap{display:flex;flex-direction:column;align-items:center;text-align:center;min-width:280px}
  .title{font-family:Georgia,serif;font-size:25px;font-weight:700;color:#476C1B;text-transform:uppercase;letter-spacing:2px;line-height:1}
  .tagline{font-size:9px;font-weight:700;color:#C89438;text-transform:uppercase;letter-spacing:3.5px;margin-top:5px}
  .brand-mark{font-size:9px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:1.2px;margin-top:2px}
  .meta{font-size:11px;color:#7a8aaa;text-align:right;line-height:1.7}
  .stats-strip{display:flex;gap:12px;margin-bottom:24px}
  .stat-box{flex:1;background:#f8f9fa;border-left:4px solid #2d5a1b;border-radius:8px;padding:12px 14px;box-shadow:0 2px 4px rgba(0,0,0,0.02)}
  .stat-box h3{font-size:19px;color:#111827;font-weight:700}
  .stat-box p{font-size:9px;color:#7a8aaa;text-transform:uppercase;letter-spacing:.5px;margin-top:3px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}
  thead tr{background:#111827}
  th{color:#FFCC00;padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px;font-weight:600}
  td{padding:10px 12px;border-bottom:1px solid #eef0f8;vertical-align:middle}
  tr:nth-child(even) td{background:#f8f9ff}
  tr:last-child td{border-bottom:none}
  .right{text-align:right}
  .badge{display:inline-block;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;white-space:nowrap}
  .badge.delivered{background:#e8f5e9;color:#15803d}
  .badge.pending{background:#fff8e1;color:#b45309}
  .badge.cancelled{background:#ffebee;color:#c62828}
  .badge.shipped{background:#e3f2fd;color:#1565c0}
  .badge.confirmed{background:#e8eaf6;color:#283593}
  .badge.out-for-delivery{background:#e0f2f1;color:#00695c}
  .footer{margin-top:36px;text-align:center;color:#aaa;font-size:10px;border-top:1px solid #eee;padding-top:12px}
  @media print{body{padding:18px 22px}}
</style></head><body>
  <div class="header">
    <div class="brand-wrap">
      <div class="title">ANYRA'S TROVE</div>
      <div class="tagline">PEOPLE FIRST</div>
      <div class="brand-mark">BY NIKITHA ENTERPRISES</div>
      <div class="muted" style="margin-top:7px;font-size:11px">Orders Report ${titleExtra}</div>
    </div>
    <div class="meta">Generated: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}</div>
  </div>
  <div class="stats-strip">
    <div class="stat-box"><h3>${orders.length}</h3><p>Filtered Orders</p></div>
    <div class="stat-box"><h3>₹${totalAmount.toLocaleString('en-IN')}</h3><p>Filtered Value</p></div>
    <div class="stat-box"><h3>${statusCounts['Delivered'] || 0}</h3><p>Delivered</p></div>
    <div class="stat-box"><h3>${statusCounts['Pending'] || 0}</h3><p>Pending</p></div>
    <div class="stat-box"><h3>${statusCounts['Cancelled'] || 0}</h3><p>Cancelled</p></div>
  </div>
  <table>
    <thead><tr>
      <th style="width:40px">#</th>
      <th>Order ID</th>
      <th>Customer</th>
      <th>Date</th>
      <th>Payment</th>
      <th>Status</th>
      <th>Items Summary</th>
      <th class="right">Total</th>
    </tr></thead>
    <tbody>${orderRows}</tbody>
  </table>
  <div class="footer">ANYRA'S TROVE &nbsp;|&nbsp; Orders Report &nbsp;|&nbsp; Generated automatically by Admin Portal</div>
</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); win.close(); }, 800);
};

const printOrderInvoiceHTML = (order, companyState = 'Tamil Nadu', documentType = 'STANDARD') => {
  const win = window.open('', '_blank');
  const isGstInvoice = documentType === 'GST';
  
  const snap = getShipping(order);
  const slots = order.slots || [];
  
  let totalMRP = 0;
  let totalDiscount = 0;
  let totalTaxable = 0;
  let totalGst = 0;
  
  const itemRows = slots.map((sl, idx) => {
    const mrp = parseFloat(sl.Product?.mrpPrice || sl.mrpPrice || sl.salesPrice || 0);
    const price = parseFloat(sl.salesPrice || 0);
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
    
    const pImage = sl.productImage ? (sl.productImage.startsWith('http') ? sl.productImage : (IMG + sl.productImage)) : (sl.Product?.mainImage ? (IMG + sl.Product?.mainImage) : null);
    
    return `
      <tr>
        <td>${idx + 1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            ${pImage ? `<img src="${pImage}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;border:1px solid #eee;flex-shrink:0" onError="this.style.display='none'"/>` : ''}
            <div>
              <div style="font-weight:700;color:#2d5a1b">${sl.Product?.name || sl.productName || 'Product'}</div>
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
  const deliveryCharge = Number(order.shippingAmount || (parseFloat(order.totalAmount || 0) - (totalMRP - totalDiscount)) || 0);
  const normalizeState = (value) => {
    const normalized = String(value || '').trim().toLowerCase().replace(/\./g, '');
    return normalized === 'tn' ? 'tamil nadu' : normalized;
  };
  const invoiceState = isGstInvoice ? order.billingState : snap?.state;
  const isInterstate = invoiceState && normalizeState(invoiceState) !== normalizeState(companyState);
  const cgst = isInterstate ? 0 : totalGst / 2;
  const sgst = isInterstate ? 0 : totalGst / 2;
  
  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${isGstInvoice ? 'GST Tax Invoice' : 'Invoice'} - #${order.orderId}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  @page { size: auto; margin: 0; }
  body{font-family:'Segoe UI',Arial,sans-serif;padding:15mm 20mm;color:#1a1a2e;background:#fff;font-size:13px;line-height:1.5}
  .invoice-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2d5a1b;padding-bottom:18px;margin-bottom:24px}
  .brand-wrap{display:flex;flex-direction:column;align-items:center;text-align:center;min-width:300px}
  .brand-name{font-family:Georgia,serif;font-size:30px;font-weight:700;letter-spacing:2px;color:#476C1B;line-height:1;text-transform:uppercase}
  .brand-sub{font-size:10.5px;font-weight:700;color:#C89438;text-transform:uppercase;letter-spacing:4px;margin-top:6px}
  .brand-mark{font-size:10px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:1.5px;margin-top:3px}
  .company-info{font-size:11px;color:#7a8aaa;margin-top:8px;line-height:1.7}
  .invoice-details{text-align:right}
  .invoice-details h2{font-size:22px;font-weight:900;color:#111827;text-transform:uppercase;letter-spacing:3px;margin-bottom:8px}
  .invoice-details p{font-size:12px;color:#475569;margin-bottom:3px}
  .address-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px}
  .address-box{border:1.5px solid #e2e8f0;border-radius:10px;padding:16px}
  .address-box h3{font-size:11px;font-weight:800;color:#2d5a1b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
  .address-box p{font-size:12.5px;color:#111827;margin-bottom:3px}
  .cust-name{font-size:14px;font-weight:800;color:#111827;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}
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
      <div class="brand-name">ANYRA'S TROVE</div>
      <div class="brand-sub">PEOPLE FIRST</div>
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
      <p><strong>Invoice No:</strong> #${order.orderId}</p>
      <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <p><strong>Payment Mode:</strong> ${order.paymentMethod || 'COD'}</p>
    </div>
  </div>

  <div class="address-grid">
    <div class="address-box">
      <h3>${isGstInvoice ? 'Business GST Billing Details' : 'Customer Billing Details'}</h3>
      <p class="cust-name">${String(isGstInvoice ? order.businessName : (order.Customer?.name || getShipping(order)?.name || 'Guest Customer')).toUpperCase()}</p>
      <p><strong>Email:</strong> ${order.Customer?.email || order.guestEmail || '—'}</p>
      <p><strong>Phone:</strong> ${order.Customer?.phone || order.snapPhone || '—'}</p>
      ${isGstInvoice ? `<p><strong>GSTIN:</strong> ${order.businessGstin}</p><p><strong>Billing Address:</strong> ${[order.billingAddress, order.billingState, order.billingPincode].filter(Boolean).join(', ')}</p>` : ''}
    </div>
    <div class="address-box">
      <h3>Shipping Address</h3>
      ${snap ? `
        <p class="cust-name">${(snap.name || order.Customer?.name || '—').toUpperCase()}</p>
        <p><strong>Phone:</strong> ${snap.phone || order.Customer?.phone || '—'}</p>
        <p><strong>Address:</strong> ${snap.addressLine || '—'}</p>
        <p>${[snap.district, snap.city, snap.state, snap.pincode].filter(Boolean).join(', ')}</p>
      ` : `
        <p style="color:#aaa;font-style:italic">Shipping address details not available</p>
      `}
    </div>
  </div>

  <table>
    <thead><tr>
      <th style="width:40px">#</th>
      <th>Item Description</th>
      <th class="right" style="width:100px">MRP Price</th>
      <th class="right" style="width:90px">Savings</th>
      <th class="right" style="width:100px">Sales Price</th>
      <th class="center" style="width:60px">Qty</th>
      <th class="right" style="width:110px">Total</th>
    </tr></thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="summary-wrap">
    <table class="summary-table">
      ${isGstInvoice && totalGst > 0 ? `
      <tr><td>Taxable Value</td><td class="right">₹${totalTaxable.toLocaleString('en-IN')}</td></tr>
      ${isInterstate
        ? `<tr><td>IGST Included</td><td class="right">₹${totalGst.toLocaleString('en-IN')}</td></tr>`
        : `<tr><td>CGST Included</td><td class="right">₹${cgst.toLocaleString('en-IN')}</td></tr><tr><td>SGST Included</td><td class="right">₹${sgst.toLocaleString('en-IN')}</td></tr>`}
      ` : ''}
      <tr>
        <td>Subtotal MRP</td>
        <td class="right">₹${totalMRP.toLocaleString('en-IN')}</td>
      </tr>
      ${finalDiscount > 0 ? `
      <tr>
        <td class="text-red">Total Savings</td>
        <td class="right text-red">-₹${finalDiscount.toLocaleString('en-IN')}</td>
      </tr>
      ` : ''}
      <tr>
        <td>Delivery &amp; Shipping</td>
        <td class="right">${deliveryCharge <= 0 ? 'FREE' : `₹${deliveryCharge.toLocaleString('en-IN')}`}</td>
      </tr>
      <tr class="grand-total">
        <td><span>GRAND TOTAL</span></td>
        <td class="right"><span>₹${Number(order.totalAmount).toLocaleString('en-IN')}</span></td>
      </tr>
    </table>
  </div>

  <div class="footer">
    Thank you for your business! This is a computer-generated document, no signature required.<br/>
    For support, email nikitha9320@gmail.com or call +91 96204 39696
  </div>
</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); win.close(); }, 800);
};

/* ──────────────────────────────────────────────────
   REACT COMPONENT
────────────────────────────────────────────────── */
const OrderPage = ({ orderStatusFilter, preorderOnly = false, cancellationOnly = false }) => {
  const location = useLocation();
  const adminRole = localStorage.getItem('adminRole') || 'admin';
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [companyState, setCompanyState] = useState('Tamil Nadu');

  const [todayOrders, setTodayOrders] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayOrderList, setTodayOrderList] = useState([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [assignModal, setAssignModal] = useState(null); // { orderId, courierPartner }
  const [packageDetails, setPackageDetails] = useState({ weight: '1', length: '10', width: '10', height: '10', shippingAmount: '' });
  const [isAssigning, setIsAssigning] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [trackingState, setTrackingState] = useState({ loading: false, orderId: null, data: null, error: '' });
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [isUpdatingSettlement, setIsUpdatingSettlement] = useState(false);

  const handleBulkSettlementUpdate = async (status) => {
    if (selectedOrderIds.length === 0) return;
    setIsUpdatingSettlement(true);
    try {
      const res = await axios.post(`${API}/orders/shipping/update-settlement`, {
        orderIds: selectedOrderIds,
        courierPaymentStatus: status
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setSelectedOrderIds([]);
        fetchOrders();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update courier settlement');
    } finally {
      setIsUpdatingSettlement(false);
    }
  };


  const query        = new URLSearchParams(location.search);
  const filter       = query.get('filter');
  const statusQuery  = query.get('status');
  const paymentQuery = query.get('paymentMethod');
  const orderIdParam = query.get('orderId');
  const isTodayFilter = filter === 'today';

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statusFilter, setStatusFilter] = useState(statusQuery || 'All');
  const [paymentFilter, setPaymentFilter] = useState(paymentQuery || 'All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');



  const effectiveStatus = statusFilter === 'All' ? (orderStatusFilter || '') : statusFilter;
  const effectivePayment = paymentFilter === 'All' ? '' : paymentFilter;

  useEffect(() => { fetchOrders(); }, [effectiveStatus, adminRole === 'admin' ? effectivePayment : '', currentPage, location.search, preorderOnly, cancellationOnly, startDate, endDate]);
  useEffect(() => { fetchTodayStats(); }, []);
  useEffect(() => {
    axios.get(`${API}/settings`).then(res => {
      if (res.data?.success && res.data.data?.COMPANY_STATE) setCompanyState(res.data.data.COMPANY_STATE);
    }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!loading && orderIdParam && orders.length > 0) {
      const match = orders.find(
        o => String(o.orderId) === String(orderIdParam) || String(o.id) === String(orderIdParam)
      );
      if (match) setSelectedOrder(match);
    }
  }, [loading, orders, orderIdParam]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/orders/all`, {
        params: {
          status: effectiveStatus,
          paymentMethod: effectivePayment || undefined,
          page:   currentPage,
          limit:  ORDERS_PER_PAGE,          // send limit to backend
          filter: isTodayFilter ? 'today' : undefined,
          preorder: preorderOnly ? 'true' : undefined,
          cancellationOnly: cancellationOnly ? 'true' : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }
      });
      if (res.data?.orders) {
        setOrders(res.data.orders);
        setTotalPages(res.data.totalPages || 1);
        setTotalOrders(res.data.totalOrders || res.data.orders.length);
        const rev = res.data.orders.reduce((a, o) => a + Number(o.totalAmount || 0), 0);
        setTotalRevenue(rev);
      }
    } catch (err) {
      console.error('API Error:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayStats = async () => {
    try {
      const res = await axios.get(`${API}/orders/all`, {
        params: { filter: 'today', page: 1, limit: 1000 }
      });
      if (res.data?.orders) {
        const list = res.data.orders;
        setTodayOrderList(list);
        setTodayOrders(list.length);
        setTodayRevenue(list.reduce((a, o) => a + Number(o.totalAmount || 0), 0));
      }
    } catch (err) {
      console.error("Today stats error:", err);
    }
  };

  const handleDownloadPDF = () => {
    if (todayOrderList.length === 0) {
      toast.info("No today's orders to download.");
      return;
    }
    printTodayOrdersHTML(todayOrderList);
  };

  const handleAssignCourier = async (e) => {
    e.preventDefault();
    if (!assignModal) return;
    setIsAssigning(true);
    try {
      const res = await axios.post(`${API}/orders/shipping/assign/${assignModal.orderId}`, {
        courierPartner: assignModal.courierPartner,
        packageDetails
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setAssignModal(null);
        fetchOrders(currentPage, statusFilter, paymentFilter);
        if (selectedOrder && selectedOrder.orderId === assignModal.orderId) {
          setSelectedOrder(prev => ({ ...prev, courierPartner: assignModal.courierPartner, awb_code: res.data.awb_code, orderStatus: 'Shipped' }));
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign courier');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDownloadLabel = async (order) => {
    setIsDownloading(true);
    try {
      const res = await axios.get(`${API}/orders/shipping/label/${order.orderId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      if (res.data.success && res.data.label) {
        const url = res.data.label;
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.download = `Label_${order.orderId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast.error('Failed to get label');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to get label');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleTrackShipment = async (order) => {
    setTrackingState({ loading: true, orderId: order.orderId, data: null, error: '' });
    try {
      const res = await axios.get(`${API}/orders/shipping/tracking/${order.orderId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });

      if (res.data.success) {
        setTrackingState({
          loading: false,
          orderId: order.orderId,
          data: res.data,
          error: ''
        });
      } else {
        const message = res.data.message || 'Tracking not available';
        setTrackingState({ loading: false, orderId: order.orderId, data: null, error: message });
        toast.error(message);
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch tracking';
      setTrackingState({ loading: false, orderId: order.orderId, data: null, error: message });
      toast.error(message);
    }
  };

  const handleCancellation = async (orderId, action) => {
    try {
      const res = await axios.post(`${API}/orders/cancel-approve/${orderId}`, { action }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      if (res.data.success) {
        toast.success(res.data.message);
        fetchOrders(currentPage, statusFilter, paymentFilter);
        if (selectedOrder && selectedOrder.orderId === orderId) {
          setSelectedOrder(prev => ({ 
            ...prev, 
            cancellationStatus: action === 'Approve' ? 'Approved' : 'Rejected', 
            orderStatus: action === 'Approve' ? 'Cancelled' : prev.orderStatus 
          }));
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to process cancellation');
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await axios.put(`${API}/orders/update/${id}`, { orderStatus: newStatus });
      toast.success(`Order status updated to ${newStatus}`);
      fetchOrders();
    } catch (err) {
      console.error('Update Error:', err);
      toast.error('Failed to update order status');
    }
  };



  const deleteOrder = (id) => {
    setDeleteTarget(id);
    toast.warn(
      <div style={{ lineHeight: 1.5 }}>
        <strong>Delete this order?</strong>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <button
            onClick={() => confirmDelete(id)}
            style={{
              background: '#ef4444', color: '#fff', border: 'none',
              borderRadius: 6, padding: '5px 14px', cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
            }}
          >
            Yes, Delete
          </button>
          <button
            onClick={() => { toast.dismiss(); setDeleteTarget(null); }}
            style={{
              background: '#e2e8f0', color: '#475569', border: 'none',
              borderRadius: 6, padding: '5px 14px', cursor: 'pointer',
              fontWeight: 600, fontSize: 13,
            }}
          >
            Cancel
          </button>
        </div>
      </div>,
      { autoClose: false, closeOnClick: false, closeButton: false, icon: '' }
    );
  };

  const confirmDelete = async (id) => {
    toast.dismiss();
    setDeleteTarget(null);
    try {
      await axios.delete(`${API}/orders/delete/${id}`);
      toast.success('Order deleted successfully');
      fetchOrders();
    } catch (err) {
      console.error('Delete Error:', err);
      toast.error('Failed to delete order');
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      + '  ·  '
      + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  /* ── Pagination helpers ── */
  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* Build page number buttons (max 5 visible) */
  const pageNumbers = () => {
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    let end   = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  /* ── Client-side payment filter ── */
  const filteredOrders = paymentFilter === 'All'
    ? orders
    : paymentFilter === 'Paid'
    ? orders.filter(o => o.paymentStatus === 'Paid' && o.paymentMethod !== 'COD')
    : paymentFilter === 'COD'
    ? orders.filter(o => o.paymentMethod === 'COD')
    : paymentFilter === 'Failed'
    ? orders.filter(o => o.paymentStatus === 'Failed')
    : orders.filter(o => (o.paymentStatus === 'Pending' || !o.paymentStatus) && o.paymentMethod !== 'COD');

  return (
    <div className="ars-order-wrapper">
      <div className="ars-main-card">
        <div className="card-header">
          <div className="title-area">
            <h1>{cancellationOnly ? 'Cancellation Requests' : preorderOnly ? 'Pre-booking' : 'Order'} <span className="gold-text">Management</span></h1>
            <p className="status-indicator">
              Showing: <b>{cancellationOnly ? 'Pending cancellation requests' : preorderOnly ? 'Pre-booking orders' : (effectiveStatus || 'All')}</b>
              {isTodayFilter ? ' today' : ''} Orders
            </p>
          </div>

          <div className="order-stats">
            <div className="stat-box">
              <p>Total Orders</p>
              <h3>{totalOrders}</h3>
            </div>
            {adminRole === 'admin' && (
            <div className="stat-box">
              <p>Total Revenue</p>
              <h3>₹{totalRevenue.toLocaleString('en-IN')}</h3>
            </div>
            )}

            <div className="stat-box stat-box--today">
              <div className="today-stat-top">
                <RiCalendarCheckLine className="today-icon" />
                <p>Today's Orders</p>
              </div>
              <h3>{todayOrders}</h3>
              <span className="today-revenue">₹{todayRevenue.toLocaleString('en-IN')}</span>
              <button
                className="pdf-download-btn"
                onClick={handleDownloadPDF}
                disabled={pdfLoading || todayOrders === 0}
                title="Download today's orders as PDF"
              >
                {pdfLoading
                  ? <span className="pdf-spinner" />
                  : <><RiDownloadLine /> Download PDF</>
                }
              </button>
            </div>
          </div>
        </div>

        {/* ── Status Filter Dropdown ── */}
        <div className="order-filter-bar">
          <div className="order-filter-dropdown-wrap">
            <RiFilter3Line className="filter-icon" />
            <select
              className="order-filter-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="All">All Orders</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Shipped">Shipped</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div className="order-date-filters" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }} 
              style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
              title="Start Date"
            />
            <span style={{ color: '#7a8aaa', fontSize: '13px' }}>to</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }} 
              style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
              title="End Date"
            />
            <button 
              onClick={() => printFilteredOrdersHTML(orders, startDate, endDate)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#2d5a1b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, marginLeft: '10px' }}
            >
              <RiDownloadLine size={16} /> Download PDF
            </button>
          </div>
          <span className="filter-result-count">
            {filteredOrders.length} orders · Page {currentPage} of {totalPages}
          </span>
        </div>

        {/* ── Payment Status Filter Tabs ── */}
        {adminRole === 'admin' && (
          <div className="payment-filter-tabs">
            {['All', 'Paid', 'COD', 'Failed', 'Pending'].map(tab => (
              <button
                key={tab}
                className={`payment-filter-tab ${paymentFilter === tab ? 'is-active' : ''} tab-${tab.toLowerCase()}`}
                onClick={() => setPaymentFilter(tab)}
              >
                {tab === 'All' && ' All Payments'}
                {tab === 'Paid' && ' Paid Online'}
                {tab === 'COD' && ' COD'}
                {tab === 'Failed' && ' Failed'}
                {tab === 'Pending' && ' Pending Online'}
                <span className="payment-filter-count">
                  {tab === 'All' ? orders.length
                    : tab === 'Paid' ? orders.filter(o => o.paymentStatus === 'Paid' && o.paymentMethod !== 'COD').length
                    : tab === 'COD' ? orders.filter(o => o.paymentMethod === 'COD').length
                    : tab === 'Failed' ? orders.filter(o => o.paymentStatus === 'Failed').length
                    : orders.filter(o => (o.paymentStatus === 'Pending' || !o.paymentStatus) && o.paymentMethod !== 'COD').length}
                </span>
              </button>
            ))}
          </div>
        )}

        {adminRole === 'admin' && selectedOrderIds.length > 0 && (
          <div className="bulk-actions-bar" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#fff9e6', border: '1px solid #ffeeba', borderRadius: '8px',
            padding: '12px 20px', marginBottom: '15px'
          }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#856404' }}>
              Selected {selectedOrderIds.length} orders
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => handleBulkSettlementUpdate('Paid')}
                disabled={isUpdatingSettlement}
                style={{
                  padding: '6px 14px', background: '#2d5a1b', color: '#fff',
                  border: 'none', borderRadius: '6px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: '600'
                }}
              >
                Mark Paid to Courier
              </button>
              <button 
                onClick={() => handleBulkSettlementUpdate('Unpaid')}
                disabled={isUpdatingSettlement}
                style={{
                  padding: '6px 14px', background: '#dc3545', color: '#fff',
                  border: 'none', borderRadius: '6px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: '600'
                }}
              >
                Mark Unpaid
              </button>
              <button 
                onClick={() => setSelectedOrderIds([])}
                style={{
                  padding: '6px 14px', background: '#fff', color: '#555',
                  border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: '600'
                }}
              >
                Cancel Selection
              </button>
            </div>
          </div>
        )}

        <div className="table-responsive">
          <table className="ars-premium-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input 
                    type="checkbox"
                    checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOrderIds(filteredOrders.map(o => o.orderId));
                      } else {
                        setSelectedOrderIds([]);
                      }
                    }}
                  />
                </th>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date</th>
                {adminRole === 'admin' && <th>Total</th>}
                {adminRole === 'admin' && <th>Payment</th>}
                <th>Courier Partner {adminRole === 'admin' && <>&amp; Cost</>}</th>
                <th>Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={adminRole === 'admin' ? "9" : "7"} className="text-center py-10">Loading Orders...</td></tr>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order, idx) => (
                  <tr key={order.orderId} data-status={order.orderStatus}>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox"
                        checked={selectedOrderIds.includes(order.orderId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrderIds(prev => [...prev, order.orderId]);
                          } else {
                            setSelectedOrderIds(prev => prev.filter(id => id !== order.orderId));
                          }
                        }}
                      />
                    </td>
                    <td><span className="id-txt">#{order.orderId}</span></td>
                    <td>
                      <div className="name-txt">{order.Customer?.name || order.snapName || 'Guest User'}</div>
                      <div className="phone-sub">{order.Customer?.phone || order.snapPhone || 'No Phone'}</div>
                    </td>
                    <td className="date-txt">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </td>
                    {adminRole === 'admin' && <td className="amount-txt">₹{Number(order.totalAmount).toLocaleString('en-IN')}</td>}
                    {adminRole === 'admin' && (
                      <td>
                        <div className={`admin-payment-badge pay-${(order.paymentStatus || 'pending').toLowerCase()}`}>
                          {order.paymentMethod === 'COD' ? 'COD' : order.paymentStatus === 'Paid' ? ' Paid' : order.paymentStatus === 'Failed' ? '❌ Failed' : '⏳ Pending'}
                        </div>
                      </td>
                    )}
                    <td>
                      {order.courierPartner ? (
                        <div style={{ fontSize: '12px', lineHeight: 1.4 }}>
                          <strong>{order.courierPartner}</strong>
                          <div style={{ color: '#555' }}>
                            Cost: ₹{Number(order.courierShippingCost || 0).toFixed(2)}
                          </div>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            backgroundColor: order.courierPaymentStatus === 'Paid' ? '#d1fae5' : '#fee2e2',
                            color: order.courierPaymentStatus === 'Paid' ? '#065f46' : '#991b1b',
                            marginTop: '4px'
                          }}>
                            {order.courierPaymentStatus === 'Paid' ? 'Paid' : 'Unpaid'}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#aaa', fontSize: '11px' }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <select
                        className={`status-select ${order.orderStatus?.toLowerCase()}`}
                        value={order.orderStatus}
                        onChange={(e) => handleStatusUpdate(order.orderId, e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Out for Delivery">Out for Delivery</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="action-cell">
                      <button className="eye-btn" onClick={() => setSelectedOrder(order)} title="View Order">
                        <RiEyeLine />
                      </button>
                      <button
                        className="del-btn"
                        onClick={() => deleteOrder(order.orderId)}
                        title="Delete Order"
                        disabled={deleteTarget === order.orderId}
                      >
                        <RiDeleteBin6Line />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="9" className="text-center py-10">No orders found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <AdminPagination
          page={currentPage}
          totalItems={totalOrders}
          pageSize={ORDERS_PER_PAGE}
          onPageChange={goToPage}
          label="orders"
        />
        <div className="pagination-footer" style={{ display: 'none' }}>
          <span className="page-info">
            Showing {orders.length === 0 ? 0 : (currentPage - 1) * ORDERS_PER_PAGE + 1}
            –{Math.min(currentPage * ORDERS_PER_PAGE, totalOrders)} of {totalOrders} orders
          </span>

          <div className="p-btns">
            <button disabled={currentPage === 1} onClick={() => goToPage(1)} title="First page">
              «
            </button>
            <button disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>
              <RiArrowLeftSLine /> Prev
            </button>

            {pageNumbers().map(n => (
              <button
                key={n}
                className={n === currentPage ? 'p-btn-active' : ''}
                onClick={() => goToPage(n)}
              >
                {n}
              </button>
            ))}

            <button disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)}>
              Next <RiArrowRightSLine />
            </button>
            <button disabled={currentPage === totalPages} onClick={() => goToPage(totalPages)} title="Last page">
              »
            </button>
          </div>
        </div>
      </div>

      {/* ── Order Detail Modal ── */}
      {selectedOrder && (() => {
        const snap   = getShipping(selectedOrder);
        const addrStr = getShippingAddressStr(selectedOrder);
        return (
          <div className="ars-modal-overlay" onClick={() => setSelectedOrder(null)}>
            <div className="ars-modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  <RiFileList3Line className="gold-text" />
                  Order <span className="gold-text">#{selectedOrder.orderId}</span>
                </h3>
                <div className="modal-header-right">
                  <span className={`modal-status-badge ${selectedOrder.orderStatus?.toLowerCase()}`}>
                    {selectedOrder.orderStatus}
                  </span>
                  <button
                    className="modal-pdf-btn"
                    title="Download the standard customer invoice"
                    onClick={() => printOrderInvoiceHTML(selectedOrder, companyState, 'STANDARD')}
                  >
                    <RiDownloadLine /> Invoice
                  </button>
                  {selectedOrder.invoiceType === 'BUSINESS_GST' && (
                    <button
                      className="modal-pdf-btn"
                      title="Download the GST tax invoice"
                      onClick={() => printOrderInvoiceHTML(selectedOrder, companyState, 'GST')}
                    >
                      <RiDownloadLine /> GST Invoice
                    </button>
                  )}
                  <button className="close-x" onClick={() => setSelectedOrder(null)}>
                    <RiCloseLine />
                  </button>
                </div>
              </div>

              <div className="modal-time-bar">
                <RiTimeLine />
                <span>Order Placed: <strong>{formatDateTime(selectedOrder.createdAt)}</strong></span>
              </div>

              <div className="modal-grid">
                <div className="modal-section">
                  <h4><RiUserLine style={{ marginRight: 6, verticalAlign: 'middle' }} />Customer Info</h4>
                  <p>{selectedOrder.Customer?.name || selectedOrder.snapName || 'Guest User'}</p>
                  <p>{selectedOrder.Customer?.email || selectedOrder.guestEmail || '—'}</p>
                  <p>{selectedOrder.Customer?.phone || selectedOrder.snapPhone || '—'}</p>
                </div>

                <div className="modal-section">
                  <h4><RiMapPinLine style={{ marginRight: 6, verticalAlign: 'middle' }} />Shipping Address</h4>
                  {snap ? (
                    <>
                      {snap.name        && <p><strong>{snap.name}</strong></p>}
                      {snap.phone       && <p>{snap.phone}</p>}
                      {snap.addressLine && <p>{snap.addressLine}</p>}
                      <p>{[snap.district, snap.city, snap.state, snap.pincode].filter(Boolean).join(', ')}</p>
                    </>
                  ) : (
                    <p className="modal-no-data">Address not available</p>
                  )}
                </div>

                <div className="modal-section modal-section--full">
                  <h4><RiShoppingBag3Line style={{ marginRight: 6, verticalAlign: 'middle' }} />Order Items</h4>
                  <div className="modal-items-list">
                    {selectedOrder.slots?.length > 0 ? (
                      selectedOrder.slots.map((item, i) => {
                        const imgPath = item.Product?.mainImage || item.productImage;
                        const imgSrc = imgPath ? `${IMG}${imgPath}` : '/assets/images/placeholder.png';
                        return (
                          <div key={i} className="modal-item-row">
                            <span className="modal-item-dot" />
                            <img 
                              src={imgSrc} 
                              alt={item.Product?.name || item.productName || 'Product'} 
                              className="modal-item-img"
                              onError={e => { e.target.src = '/assets/images/placeholder.png'; }}
                              style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)', flexShrink: 0 }}
                            />
                            <span className="modal-item-name">
                              {item.Product?.name || item.productName || 'Product'}
                              {item.variantLabel && <small style={{ display: 'block', color: '#64748b', fontWeight: 500 }}>{item.variantLabel}</small>}
                            </span>
                            <span className="modal-item-qty">× {item.quantity}</span>
                            <span className="modal-item-price">
                              ₹{Number(item.salesPrice * item.quantity).toLocaleString('en-IN')}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="modal-no-data">No items found</p>
                    )}
                  </div>
                  <div className="modal-total-row">
                    <span>Grand Total</span>
                    <span className="modal-total-amount">
                      ₹{Number(selectedOrder.totalAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="modal-section modal-section--full" style={{ marginTop: '20px' }}>
                  <h4>Courier & Shipping</h4>
                  {selectedOrder.courierPartner ? (
                    <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                      <p><strong>Courier Partner:</strong> {selectedOrder.courierPartner}</p>
                      <p><strong>{selectedOrder.courierPartner === 'Manual' ? 'Tracking Details / Note' : 'AWB Code'}:</strong> {selectedOrder.awb_code || 'N/A'}</p>
                      
                      {adminRole === 'admin' && (
                        <div style={{ margin: '10px 0', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <p style={{ margin: 0 }}><strong>Actual Courier Cost:</strong> ₹{Number(selectedOrder.courierShippingCost || 0).toFixed(2)}</p>
                          <p style={{ margin: 0 }}>
                            <strong>Courier Payment Status:</strong>{' '}
                            <span style={{
                              padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                              backgroundColor: selectedOrder.courierPaymentStatus === 'Paid' ? '#d1fae5' : '#fee2e2',
                              color: selectedOrder.courierPaymentStatus === 'Paid' ? '#065f46' : '#991b1b',
                            }}>
                              {selectedOrder.courierPaymentStatus === 'Paid' ? 'Paid to Courier' : 'Unpaid'}
                            </span>
                          </p>
                          <button 
                            onClick={async () => {
                              const newStatus = selectedOrder.courierPaymentStatus === 'Paid' ? 'Unpaid' : 'Paid';
                              try {
                                const res = await axios.post(`${API}/orders/shipping/update-settlement`, {
                                  orderIds: [selectedOrder.orderId],
                                  courierPaymentStatus: newStatus
                                });
                                if (res.data.success) {
                                  toast.success('Courier settlement updated');
                                  setSelectedOrder(prev => ({ ...prev, courierPaymentStatus: newStatus }));
                                  fetchOrders();
                                }
                              } catch (err) {
                                toast.error('Failed to update settlement status');
                              }
                            }}
                            style={{
                              padding: '4px 10px', background: '#fff', border: '1px solid #ccc', borderRadius: '4px',
                              cursor: 'pointer', fontSize: '11px', fontWeight: '600'
                            }}
                          >
                            Mark as {selectedOrder.courierPaymentStatus === 'Paid' ? 'Unpaid' : 'Paid'}
                          </button>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                        {selectedOrder.courierPartner !== 'Manual' && (
                          <button 
                            onClick={() => handleDownloadLabel(selectedOrder)}
                            disabled={isDownloading}
                            style={{ padding: '8px 16px', background: '#2d5a1b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            {isDownloading ? 'Downloading...' : 'Download Shipping Label'}
                          </button>
                        )}
                        {(selectedOrder.courierPartner === 'Manual' || selectedOrder.awb_code || selectedOrder.tracking_url) && (
                          <button 
                            onClick={() => handleTrackShipment(selectedOrder)}
                            disabled={trackingState.loading && trackingState.orderId === selectedOrder.orderId}
                            style={{ padding: '8px 16px', background: '#fff', color: '#2d5a1b', border: '1px solid #2d5a1b', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            {trackingState.loading && trackingState.orderId === selectedOrder.orderId ? 'Loading Tracking...' : 'Refresh Live Status'}
                          </button>
                        )}
                      </div>

                      {/* Flipkart / Amazon Style Stage-by-Stage Stepper */}
                      <OrderTrackingStepper 
                        order={selectedOrder} 
                        trackingData={trackingState.orderId === selectedOrder.orderId ? trackingState.data : null} 
                      />

                      {trackingState.orderId === selectedOrder.orderId && trackingState.error && (
                        <p style={{ marginTop: '10px', color: '#b91c1c', fontSize: '13px' }}>{trackingState.error}</p>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => { setPackageDetails({ weight: '1', length: '10', width: '10', height: '10' }); setAssignModal({ orderId: selectedOrder.orderId, courierPartner: 'Shiprocket' }); }}
                        style={{ padding: '8px 16px', background: '#fff', color: '#2d5a1b', border: '1px solid #2d5a1b', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        Assign via Shiprocket
                      </button>
                      <button 
                        onClick={() => { setPackageDetails({ weight: '1', length: '10', width: '10', height: '10' }); setAssignModal({ orderId: selectedOrder.orderId, courierPartner: 'DTDC' }); }}
                        style={{ padding: '8px 16px', background: '#fff', color: '#2d5a1b', border: '1px solid #2d5a1b', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        Assign via DTDC
                      </button>
                      <button 
                        onClick={() => { setPackageDetails({}); setAssignModal({ orderId: selectedOrder.orderId, courierPartner: 'Manual' }); }}
                        style={{ padding: '8px 16px', background: '#fff', color: '#6c757d', border: '1px solid #6c757d', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        Assign via Manual Shipping
                      </button>
                    </div>

                  )}
                </div>

                {selectedOrder.cancellationStatus === 'Requested' && (
                  <div className="modal-section modal-section--full" style={{ marginTop: '20px' }}>
                    <h4 style={{ color: '#dc3545' }}>Cancellation Requested</h4>
                    <div style={{ padding: '15px', background: '#fff5f5', borderRadius: '8px', border: '1px solid #ffc9c9' }}>
                      <p><strong>Reason:</strong> {selectedOrder.cancellationReason || 'No reason provided'}</p>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button 
                          onClick={() => handleCancellation(selectedOrder.orderId, 'Approve')}
                          style={{ padding: '8px 16px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          Approve Cancellation
                        </button>
                        <button 
                          onClick={() => handleCancellation(selectedOrder.orderId, 'Reject')}
                          style={{ padding: '8px 16px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          Reject Request
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {selectedOrder.cancellationStatus === 'Approved' && (
                  <div className="modal-section modal-section--full" style={{ marginTop: '20px', padding: '15px', background: '#f8d7da', borderRadius: '8px' }}>
                    <h4 style={{ color: '#721c24' }}>Order Cancelled</h4>
                    <p>This order was successfully cancelled and stock has been restored.</p>
                  </div>
                )}
                {selectedOrder.cancellationStatus === 'Rejected' && (
                  <div className="modal-section modal-section--full" style={{ marginTop: '20px', padding: '15px', background: '#e2e3e5', borderRadius: '8px' }}>
                    <h4>Cancellation Rejected</h4>
                    <p>The cancellation request for this order was rejected.</p>
                  </div>
                )}

              </div>
            </div>
          </div>
        );
      })()}

      {assignModal && (
        <div className="ars-modal-overlay" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="ars-modal-content" style={{ maxWidth: '420px', borderRadius: '12px', padding: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <div className="modal-header" style={{ borderBottom: '2px solid #2d5a1b', paddingBottom: '15px', marginBottom: '20px' }}>
              <h3 style={{ color: '#2d5a1b', fontSize: '20px', fontWeight: '700', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Assign <span style={{ color: '#FFCC00' }}>{assignModal.courierPartner}</span>
              </h3>
              <button className="close-x" onClick={() => setAssignModal(null)} style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#555', transition: 'all 0.2s ease' }} onMouseOver={e => { e.currentTarget.style.background='#ffebee'; e.currentTarget.style.color='#e53935' }} onMouseOut={e => { e.currentTarget.style.background='#f5f5f5'; e.currentTarget.style.color='#555' }}>
                <RiCloseLine size={20} />
              </button>
            </div>
            <form onSubmit={handleAssignCourier} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {assignModal.courierPartner === 'Manual' ? (
                <div style={{ padding: '10px', background: '#eef2ff', borderRadius: '8px', color: '#4f46e5', fontWeight: '600', textAlign: 'center' }}>
                  <p style={{ margin: 0 }}>You are assigning this order manually.</p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px', fontWeight: 'normal' }}>No tracking or amount required right now.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#444' }}>Weight (kg)</label>
                    <input type="number" step="0.01" required value={packageDetails.weight || ''} onChange={e => setPackageDetails(p => ({ ...p, weight: e.target.value }))} style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', transition: 'border-color 0.2s', outline: 'none' }} onFocus={e => e.target.style.borderColor = '#2d5a1b'} onBlur={e => e.target.style.borderColor = '#ddd'} placeholder="e.g. 1.5" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#444' }}>Length (cm)</label>
                      <input type="number" step="0.1" required value={packageDetails.length || ''} onChange={e => setPackageDetails(p => ({ ...p, length: e.target.value }))} style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', transition: 'border-color 0.2s', outline: 'none' }} onFocus={e => e.target.style.borderColor = '#2d5a1b'} onBlur={e => e.target.style.borderColor = '#ddd'} placeholder="10" />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#444' }}>Width (cm)</label>
                      <input type="number" step="0.1" required value={packageDetails.width || ''} onChange={e => setPackageDetails(p => ({ ...p, width: e.target.value }))} style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', transition: 'border-color 0.2s', outline: 'none' }} onFocus={e => e.target.style.borderColor = '#2d5a1b'} onBlur={e => e.target.style.borderColor = '#ddd'} placeholder="10" />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#444' }}>Height (cm)</label>
                      <input type="number" step="0.1" required value={packageDetails.height || ''} onChange={e => setPackageDetails(p => ({ ...p, height: e.target.value }))} style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', transition: 'border-color 0.2s', outline: 'none' }} onFocus={e => e.target.style.borderColor = '#2d5a1b'} onBlur={e => e.target.style.borderColor = '#ddd'} placeholder="10" />
                    </div>
                  </div>
                </>
              )}
              <button type="submit" disabled={isAssigning} style={{ marginTop: '10px', padding: '14px', background: isAssigning ? '#6fa65b' : '#2d5a1b', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', cursor: isAssigning ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px rgba(45, 90, 27, 0.2)', transition: 'background-color 0.2s' }} onMouseOver={e => !isAssigning && (e.currentTarget.style.backgroundColor = '#1e3f12')} onMouseOut={e => !isAssigning && (e.currentTarget.style.backgroundColor = '#2d5a1b')}>
                {isAssigning ? 'Assigning Courier...' : `Confirm & Assign to ${assignModal.courierPartner}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderPage;
