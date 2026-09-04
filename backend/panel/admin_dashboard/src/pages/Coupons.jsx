import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaTrash, FaEdit, FaEye } from "react-icons/fa";
import './ProductPage.css';
import './Coupons.css';

import { API, IMG } from '../config';
import AdminPagination, { ADMIN_PAGE_SIZE } from '../components/AdminPagination';

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editId, setEditId] = useState(null);
  const [errors, setErrors] = useState({});
  const [usageDetails, setUsageDetails] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const expiryCheckRef = useRef(null);

  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage',
    discountValue: '',
    targetType: 'SHOP',
    productId: '',
    startDate: '',
    endDate: '',
    usageLimit: 100,
    status: true,
  });

  /* ── Fetch coupons ── */
  const fetchCoupons = async () => {
    try {
      const res = await axios.get(`${API}/coupons/all`);
      setCoupons(res.data);
    } catch (err) {
      console.error('Error fetching coupons', err);
    }
  };

  /* ── On mount: fetch ── */
  useEffect(() => {
    fetchCoupons();
    axios.get(`${API}/products/all`, { headers: { 'x-admin-request': 'true' } })
      .then(res => setProducts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setProducts([]));
  }, []);

  /* ── Delete with toast confirmation ── */
  const handleDeleteRequest = (id) => {
    setDeleteTarget(id);
    toast.warn(
      <div style={{ lineHeight: 1.5 }}>
        <strong>Delete this coupon?</strong>
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
      {
        autoClose: false,
        closeOnClick: false,
        closeButton: false,
        icon: '🗑️',
      }
    );
  };

  const confirmDelete = async (id) => {
    toast.dismiss();
    setDeleteTarget(null);
    try {
      await axios.delete(`${API}/coupons/${id}`);
      toast.success('Coupon deleted successfully');
      fetchCoupons();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await axios.patch(`${API}/coupons/status/${id}`);
      toast.success(res.data.message || 'Status updated successfully');
      fetchCoupons();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleEditRequest = (coupon) => {
    setEditId(coupon._id || coupon.id);
    setFormData({
      code: coupon.code,
      type: coupon.type,
      discountValue: coupon.discountValue,
      targetType: coupon.targetType || 'SHOP',
      productId: coupon.productId || '',
      startDate: formatDateForInput(coupon.startDate),
      endDate: formatDateForInput(coupon.endDate),
      usageLimit: coupon.usageLimit || 100,
      status: coupon.status,
    });
    setErrors({});
    setShowModal(true);
  };

  const handleViewUsage = async (coupon) => {
    try {
      const res = await axios.get(`${API}/coupons/${coupon.id || coupon._id}/usage`);
      setUsageDetails(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Unable to load coupon usage details');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.code.trim()) {
      newErrors.code = 'Coupon Code is required.';
      toast.error('Coupon Code is required.');
    }
    if (formData.discountValue === '' || formData.discountValue === null || formData.discountValue === undefined) {
      newErrors.discountValue = 'Discount Value is required.';
      toast.error('Discount Value is required.');
    } else {
      const val = parseFloat(formData.discountValue);
      if (val <= 0 || isNaN(val)) {
        newErrors.discountValue = 'Discount Value must be a positive number.';
        toast.error('Discount Value must be a positive number.');
      }
    }
    if (formData.targetType === 'PRODUCT' && !formData.productId) {
      newErrors.productId = 'Select a product for this coupon.';
      toast.error('Select a product for this coupon.');
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Start Date is required.';
      toast.error('Start Date is required.');
    }
    if (!formData.endDate) {
      newErrors.endDate = 'End Date is required.';
      toast.error('End Date is required.');
    }
    if (formData.startDate && formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      newErrors.endDate = 'End Date cannot be before Start Date.';
      toast.error('End Date cannot be before Start Date.');
    }
    if (formData.usageLimit === '' || formData.usageLimit === null || formData.usageLimit === undefined) {
      newErrors.usageLimit = 'Usage Limit is required.';
      toast.error('Usage Limit is required.');
    } else {
      const limit = parseInt(formData.usageLimit);
      if (limit <= 0 || isNaN(limit)) {
        newErrors.usageLimit = 'Usage Limit must be a positive integer.';
        toast.error('Usage Limit must be a positive integer.');
      }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      if (editId) {
        await axios.put(`${API}/coupons/update/${editId}`, formData);
        toast.success('Coupon Updated Successfully!');
      } else {
        await axios.post(`${API}/coupons/add`, formData);
        toast.success('Coupon Created Successfully!');
      }
      closeAndReset();
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save coupon');
    } finally {
      setLoading(false);
    }
  };

  const closeAndReset = () => {
    setShowModal(false);
    setEditId(null);
    setFormData({
      code: '', type: 'percentage',
      discountValue: '', targetType: 'SHOP', productId: '',
      startDate: '', endDate: '',
      usageLimit: 100, status: true,
    });
    setErrors({});
  };

  /* ── Helpers ── */
  const isExpired = (endDate) => new Date(endDate) < new Date();
  const totalUsage = coupons.reduce((total, c) => total + (c.usedCount || 0), 0);

  const totalPages = Math.max(1, Math.ceil(coupons.length / ADMIN_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCoupons = coupons.slice((safePage - 1) * ADMIN_PAGE_SIZE, safePage * ADMIN_PAGE_SIZE);
  const selectedProduct = products.find(product => Number(product.id) === Number(formData.productId));
  const imageUrl = (product) => {
    const image = product?.mainImage;
    if (!image) return '';
    return image.startsWith('http') ? image : `${IMG}/${image.replace(/^\/+/, '')}`;
  };

  return (
    <div className="pp-wrap">

      {/* ── Top Bar ── */}
      <div className="pp-list-topbar">
        <div className="pp-list-title">
          <h2>Manage Coupons</h2>
          <span className="pp-count-pill">{coupons.length} coupons</span>
          <span className="pp-count-pill">{totalUsage} used</span>
        </div>
        <div className="pp-list-actions">
          <button className="pp-btn-add" onClick={() => setShowModal(true)}>
            + Create Coupon
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="pp-table-card">
        <div className="pp-table-scroll">
          <table className="pp-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Applies To</th>
                {/* <th>Usage</th> */}
                <th>Validity</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="pp-empty">
                      <div className="pp-empty-icon"></div>
                      No coupons found. Create your first one!
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCoupons.map((c) => {
                  const usedCount    = c.usedCount || 0;
                  const usageLimit   = c.usageLimit || 1;
                  const usagePct     = Math.min(100, Math.round((usedCount / usageLimit) * 100));
                  const limitReached = usedCount >= usageLimit;
                  const expired      = isExpired(c.endDate);
                  const couponProduct = c.product || products.find(product => Number(product.id) === Number(c.productId));

                  const barColor = limitReached
                    ? '#e53935'
                    : usagePct >= 80
                    ? '#ff9800'
                    : '#2e7d32';

                  return (
                    <tr
                      key={c._id || c.id}
                      style={expired ? { opacity: 0.5, background: '#fff5f5' } : {}}
                    >
                      <td>
                        <span className="coupon-code-badge">{c.code}</span>
                        {expired && (
                          <span style={{
                            display: 'block', marginTop: 4,
                            fontSize: 10, fontWeight: 700,
                            color: '#fff', background: '#e53935',
                            borderRadius: 4, padding: '2px 6px',
                            width: 'fit-content'
                          }}>
                            EXPIRED
                          </span>
                        )}
                      </td>

                      <td><span className="pp-type-badge">{c.type}</span></td>

                      <td className="pp-td-sale" style={{ fontWeight: 600 }}>
                        {c.type === 'percentage'
                          ? `${c.discountValue}%`
                          : `₹${c.discountValue}`}
                      </td>

                      <td>
                        {c.targetType === 'PRODUCT'
                          ? couponProduct ? <div className="coupon-product-ref">
                              {imageUrl(couponProduct) ? <img src={imageUrl(couponProduct)} alt="" /> : <span className="coupon-product-ref__fallback">P</span>}
                              <strong title={couponProduct.name}>{couponProduct.name}</strong>
                            </div>
                            : <span className="coupon-product-ref__missing">Product unavailable</span>
                          : <span style={{ color: '#475569', fontWeight: 600, fontSize: 13 }}>Entire shop</span>
                        }
                        <div style={{ display: 'none', fontSize: 13 }}>
                          <span style={{ color: 'var(--color-text-secondary)' }}>Min: </span>
                          <strong>₹{parseFloat(c.minOrderAmount).toLocaleString('en-IN')}</strong>
                        </div>
                        <div style={{ display: 'none', fontSize: 13 }}>
                          {c.maxOrderAmount
                            ? <>
                                <span style={{ color: 'var(--color-text-secondary)' }}>Max: </span>
                                <strong>₹{parseFloat(c.maxOrderAmount).toLocaleString('en-IN')}</strong>
                              </>
                            : <span style={{ color: '#2e7d32', fontSize: 12 }}>No upper limit</span>
                          }
                        </div>
                      </td>

                      {/* <td>
                        <div className="usage-txt" style={{ fontWeight: 600 }}>
                          {usedCount} {usedCount === 1 ? 'time' : 'times'} used
                        </div>
                      </td> */}

                      <td>
                        <div className="date-range" style={{ color: expired ? '#e53935' : undefined }}>
                          {new Date(c.startDate).toLocaleDateString()} –{" "}
                          {new Date(c.endDate).toLocaleDateString()}
                        </div>
                      </td>

                      <td>
                        <button
                          onClick={() => !expired && handleToggleStatus(c._id || c.id)}
                          disabled={expired}
                          className={`pp-status-badge ${c.status && !expired ? 'in' : 'out'}`}
                          style={{
                            border: 'none',
                            cursor: expired ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          title={expired ? "Expired coupons cannot be toggled" : `Click to toggle status`}
                        >
                          {expired ? 'Expired' : c.status ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="edit-btn"
                            onClick={() => handleViewUsage(c)}
                            title="View coupon usage"
                          >
                            <FaEye />
                          </button>
                          <button
                            className="edit-btn"
                            onClick={() => handleEditRequest(c)}
                            title="Edit Coupon"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDeleteRequest(c._id || c.id)}
                            title="Delete Coupon"
                            disabled={deleteTarget === (c._id || c.id)}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination page={safePage} totalItems={coupons.length} onPageChange={setCurrentPage} label="coupons" />
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="ars-modal-overlay" onClick={closeAndReset}>
          <div className="ars-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="pp-form-title" style={{ fontSize: 20 }}>{editId ? 'Edit Coupon' : 'Add New Coupon'}</h3>
              <button className="close-btn" onClick={closeAndReset}>✕</button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit} noValidate>

              <div className="form-field">
                <label className="form-label">Coupon Code *</label>
                <input
                  name="code" type="text" placeholder="e.g. SAVE50"
                  value={formData.code} onChange={handleChange}
                  className={`styled-input ${errors.code ? 'invalid-input' : ''}`}
                />
                {errors.code && <span className="error-msg">{errors.code}</span>}
              </div>

              <div className="dual-input-row">
                <div className="form-field">
                  <label className="form-label">Discount Type *</label>
                  <select name="type" value={formData.type} onChange={handleChange} className="styled-input">
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat (₹)</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Discount Value *</label>
                  <input
                    name="discountValue" type="number"
                    placeholder={formData.type === 'percentage' ? 'e.g. 10 (%)' : 'e.g. 50 (₹)'}
                    value={formData.discountValue} onChange={handleChange}
                    className={`styled-input ${errors.discountValue ? 'invalid-input' : ''}`}
                  />
                  {errors.discountValue && <span className="error-msg">{errors.discountValue}</span>}
                </div>
              </div>

              <div className="dual-input-row">
                <div className="form-field">
                  <label className="form-label">Coupon Scope *</label>
                  <select name="targetType" value={formData.targetType} onChange={handleChange} className="styled-input">
                    <option value="SHOP">Entire Shop</option>
                    <option value="PRODUCT">Particular Product</option>
                  </select>
                </div>
                {formData.targetType === 'PRODUCT' && (
                  <div className="form-field">
                    <label className="form-label">Choose Product *</label>
                    <select name="productId" value={formData.productId} onChange={handleChange} className="styled-input">
                      <option value="">Select product</option>
                      {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
                    </select>
                    {errors.productId && <span className="error-msg">{errors.productId}</span>}
                    {selectedProduct && (
                      <div className="coupon-selected-product-preview">
                        {imageUrl(selectedProduct) ? <img src={imageUrl(selectedProduct)} alt={selectedProduct.name} /> : <span>Product</span>}
                        <strong>{selectedProduct.name}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="dual-input-row" style={{ display: 'none' }}>
                <div className="form-field">
                  <label className="form-label">Min Order Amount (₹) *</label>
                  <input
                    name="minOrderAmount" type="number" placeholder="e.g. 300"
                    value={formData.minOrderAmount} onChange={handleChange}
                    className={`styled-input ${errors.minOrderAmount ? 'invalid-input' : ''}`} min="0"
                  />
                  {errors.minOrderAmount && <span className="error-msg">{errors.minOrderAmount}</span>}
                </div>
                <div className="form-field">
                  <label className="form-label">
                    Max Order Amount (₹)
                    <span style={{ color: '#999', fontSize: 11, marginLeft: 4 }}>optional</span>
                  </label>
                  <input
                    name="maxOrderAmount" type="number"
                    placeholder="e.g. 500 (empty = no limit)"
                    value={formData.maxOrderAmount} onChange={handleChange}
                    className="styled-input" min="0"
                  />
                </div>
              </div>

              <div className="dual-input-row">
                <div className="form-field">
                  <label className="form-label">Start Date *</label>
                  <input
                    name="startDate" type="date"
                    value={formData.startDate} onChange={handleChange}
                    className={`styled-input ${errors.startDate ? 'invalid-input' : ''}`}
                  />
                  {errors.startDate && <span className="error-msg">{errors.startDate}</span>}
                </div>
                <div className="form-field">
                  <label className="form-label">End Date *</label>
                  <input
                    name="endDate" type="date"
                    value={formData.endDate} onChange={handleChange}
                    className={`styled-input ${errors.endDate ? 'invalid-input' : ''}`}
                  />
                  {errors.endDate && <span className="error-msg">{errors.endDate}</span>}
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Usage Limit *</label>
                <input
                  name="usageLimit" type="number" placeholder="e.g. 100"
                  value={formData.usageLimit} onChange={handleChange}
                  className={`styled-input ${errors.usageLimit ? 'invalid-input' : ''}`} min="1"
                />
                {errors.usageLimit && <span className="error-msg">{errors.usageLimit}</span>}
              </div>

              <div className="modal-footer">
                <button type="button" className="pp-btn-cancel" onClick={closeAndReset}>Cancel</button>
                <button type="submit" className="pp-btn-save" disabled={loading}>
                  {loading ? 'Saving...' : editId ? 'Save Changes' : 'Create Coupon'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {usageDetails && (
        <div className="ars-modal-overlay" onClick={() => setUsageDetails(null)}>
          <div className="ars-modal" style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="pp-form-title" style={{ fontSize: 20 }}>Usage: {usageDetails.coupon.code}</h3>
              <button className="close-btn" onClick={() => setUsageDetails(null)}>×</button>
            </div>
            <p style={{ margin: '0 0 16px', color: '#64748b' }}>{usageDetails.orders.length} order(s) used this coupon.</p>
            {usageDetails.orders.length === 0 ? <div className="pp-empty">No customer has used this coupon yet.</div> : (
              <div style={{ maxHeight: 440, overflow: 'auto' }}>
                {usageDetails.orders.map(order => (
                  <div key={order.orderId} style={{ padding: '14px 0', borderTop: '1px solid #e2e8f0' }}>
                    <strong>{order.orderId}</strong> · {new Date(order.createdAt).toLocaleString('en-IN')}
                    <div style={{ marginTop: 5 }}>{order.Customer?.name || 'Customer'} · {order.Customer?.phone || '—'} · {order.Customer?.email || '—'}</div>
                    <div style={{ marginTop: 5, color: '#475569' }}>Discount: ₹{Number(order.discountAmount || 0).toLocaleString('en-IN')} · Total: ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}</div>
                    <div style={{ marginTop: 5, fontSize: 13, color: '#64748b' }}>{(order.slots || []).map(s => `${s.productName || 'Product'}${s.variantLabel ? ` (${s.variantLabel})` : ''} × ${s.quantity}`).join(', ')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Coupons;
