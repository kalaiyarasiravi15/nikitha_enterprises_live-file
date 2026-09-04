import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { API, IMG } from '../config';
import AdminPagination, { ADMIN_PAGE_SIZE } from '../components/AdminPagination';

const DEALS_API = `${API}/deals`;

const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div className="pp-confirm-overlay">
    <div className="pp-confirm-box">
      <div className="pp-confirm-icon">
        <RiDeleteBin6Line style={{ fontSize: '32px', color: '#ef4444' }} />
      </div>
      <p className="pp-confirm-msg">{message}</p>
      <div className="pp-confirm-actions">
        <button className="pp-confirm-cancel" onClick={onCancel}>Cancel</button>
        <button className="pp-confirm-ok" onClick={onConfirm}>Remove</button>
      </div>
    </div>
  </div>
);

const getLocalISOTime = () => {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffset).toISOString().slice(0, 16);
};

const FormField = ({ label, required, fieldName, errors, children }) => {
  const state = errors[fieldName] ? 'invalid' : '';
  return (
    <div className={`pp-field pp-field--state-${state}`}>
      <label className="pp-price-label">
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
      {state === 'invalid' && errors[fieldName] && (
        <span className="error-msg">{errors[fieldName]}</span>
      )}
    </div>
  );
};

const ManageDeals = () => {
  const [deals, setDeals]               = useState([]);
  const [loading, setLoading]           = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [file, setFile]                 = useState(null);
  const [editingId, setEditingId]       = useState(null);
  const [errors, setErrors]             = useState({});
  const [currentPage, setCurrentPage]   = useState(1);
  const [panel, setPanel]               = useState('list');

  const [confirmOpen, setConfirmOpen]     = useState(false);
  const [confirmMsg, setConfirmMsg]       = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  const [products, setProducts] = useState([]);

  const [formData, setFormData] = useState({
    title:       '',
    description: '',
    startDate:   '',
    expiryDate:  '',
    buttonText:  'SHOP NOW',
    buttonLink:  '/shop',
    discountPercentage: '',
    isActive:    true,
    discountType: '',
    discountValue: '',
    targetAudience: '',
    targetType: 'SHOP',
    targetProductId: ''
  });

  const fetchDealsAndProducts = useCallback(async () => {
    setFetchLoading(true);
    try {
      const [resDeals, resProducts] = await Promise.all([
        axios.get(`${DEALS_API}/all`),
        axios.get(`${API}/products/all`)
      ]);
      setDeals(resDeals.data || []);
      setProducts(resProducts.data || []);
    } catch (err) {
      console.error("Fetch error:", err.message);
    } finally {
      setFetchLoading(false);
    }
  }, []);

  useEffect(() => { fetchDealsAndProducts(); }, [fetchDealsAndProducts]);

  const now = new Date();
  const hasActiveShopDeal = deals.some(d => {
    const isEditingThis = editingId && (d.id === editingId || d._id === editingId);
    return d.isActive && d.targetType === 'SHOP' && new Date(d.expiryDate) > now && !isEditingThis;
  });

  const activeProductDealIds = new Set(deals.filter(d => {
    const isEditingThis = editingId && (d.id === editingId || d._id === editingId);
    return d.isActive && d.targetType === 'PRODUCT' && new Date(d.expiryDate) > now && !isEditingThis;
  }).map(d => parseInt(d.targetProductId)));

  const totalPages = Math.max(1, Math.ceil(deals.length / ADMIN_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedDeals = deals.slice((safePage - 1) * ADMIN_PAGE_SIZE, safePage * ADMIN_PAGE_SIZE);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ title: '', description: '', startDate: '', expiryDate: '', buttonText: 'SHOP NOW', buttonLink: '/shop', discountPercentage: '', isActive: true, discountType: '', discountValue: '', targetAudience: '', targetType: 'SHOP', targetProductId: '' });
    setFile(null);
    setErrors({});
    setPanel('list');
  };

  const handleEdit = (deal) => {
    setEditingId(deal.id || deal._id);
    setFormData({
      title:       deal.title,
      description: deal.description,
      startDate:   deal.startDate ? new Date(deal.startDate).toISOString().slice(0, 16) : '',
      expiryDate:  deal.expiryDate ? new Date(deal.expiryDate).toISOString().slice(0, 16) : '',
      buttonText:  deal.buttonText,
      buttonLink:  deal.buttonLink,
      discountPercentage: deal.discountPercentage || '',
      discountType: deal.discountType || 'PERCENTAGE',
      discountValue: deal.discountValue || '',
      targetAudience: deal.targetAudience || 'ALL',
      targetType: deal.targetType || 'SHOP',
      targetProductId: deal.targetProductId || '',
      isActive:    deal.isActive
    });
    setErrors({});
    setPanel('form');
  };

  const showConfirm = (message, action) => {
    setConfirmMsg(message);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };
  const handleConfirmYes = () => {
    setConfirmOpen(false);
    confirmAction && confirmAction();
  };
  const handleConfirmNo = () => {
    setConfirmOpen(false);
    setConfirmAction(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.buttonText || !formData.buttonText.trim()) {
      formData.buttonText = "SHOP NOW";
    }
    
    if (formData.targetType === 'PRODUCT' && formData.targetProductId) {
      formData.buttonLink = `/product/${formData.targetProductId}`;
    } else {
      formData.buttonLink = "/shop";
    }

    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Deal Title is required.';
    }
    if (formData.targetType === 'PRODUCT' && !formData.targetProductId) {
      newErrors.targetProductId = 'Product Selection is required.';
    }
    if (!formData.discountType) {
      newErrors.discountType = 'Discount Type is required.';
    }
    if (!formData.targetAudience) {
      newErrors.targetAudience = 'Target Audience is required.';
    }
    if (formData.discountValue === '' || formData.discountValue === null || formData.discountValue === undefined) {
      newErrors.discountValue = 'Discount Value is required.';
    } else {
      const val = parseFloat(formData.discountValue);
      if (val <= 0 || isNaN(val)) {
        newErrors.discountValue = 'Discount Value must be greater than 0.';
      } else if (formData.discountType === 'PERCENTAGE' && val > 100) {
        newErrors.discountValue = 'Discount Percentage must be between 1 and 100.';
      }
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Start Date is required.';
    }
    if (!formData.expiryDate) {
      newErrors.expiryDate = 'Expiry Date is required.';
    }
    if (formData.startDate && formData.expiryDate && new Date(formData.startDate) >= new Date(formData.expiryDate)) {
      newErrors.expiryDate = 'Expiry Date must be after Start Date.';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required.';
    }
    if (!file && !editingId) {
      newErrors.image = 'Banner Image is required.';
    }
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
        toast.error("Please fill all required fields correctly.");
        return;
    }

    formData.discountPercentage = formData.discountType === 'PERCENTAGE' ? parseInt(formData.discountValue) : 0;

    setLoading(true);
    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    if (file) data.append('image', file);

    try {
      if (editingId) {
        await axios.put(`${DEALS_API}/update/${editingId}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success("Deal updated successfully!");
      } else {
        await axios.post(`${DEALS_API}/add`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success("New deal activated!");
      }
      resetForm();
      fetchDealsAndProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    showConfirm(
      "Remove this deal from the live site?",
      async () => {
        try {
          await axios.delete(`${DEALS_API}/${id}`);
          toast.success("Deal removed successfully!");
          fetchDealsAndProducts();
        } catch (err) {
          toast.error("Delete failed: " + (err.response?.data?.message || err.message));
        }
      }
    );
  };

  if (panel === 'form') return (
    <div className="pp-wrap">
      {confirmOpen && (
        <ConfirmDialog message={confirmMsg} onConfirm={handleConfirmYes} onCancel={handleConfirmNo} />
      )}

      <div className="pp-form-topbar">
        <button className="pp-back-btn" onClick={resetForm}>← Back</button>
        <h2 className="pp-form-title">{editingId ? 'Edit Deal' : 'New Deal'}</h2>
      </div>

      <div style={{ maxWidth: '650px' }}>
        <form onSubmit={handleSubmit} noValidate>
          <div className="pp-section-card">
            <div className="pp-section-label">Deal Details</div>

            <FormField label="Deal Title" required fieldName="title" errors={errors}>
              <input className={`pp-input ${errors.title ? 'invalid-input' : ''}`} type="text" name="title" value={formData.title} onChange={handleInputChange} />
            </FormField>

            <FormField label="Description" required fieldName="description" errors={errors}>
              <textarea className={`pp-input ${errors.description ? 'invalid-input' : ''}`} style={{ resize: 'vertical', minHeight: '80px' }} name="description" value={formData.description} onChange={handleInputChange} />
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <FormField label="Discount Type" required fieldName="discountType" errors={errors}>
                  <select className={`pp-input ${errors.discountType ? 'invalid-input' : ''}`} name="discountType" value={formData.discountType} onChange={handleInputChange}>
                    <option value="">Select Discount Type *</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </FormField>
                <FormField label="Discount Value" required fieldName="discountValue" errors={errors}>
                  <input className={`pp-input ${errors.discountValue ? 'invalid-input' : ''}`} type="number" min="0" name="discountValue" value={formData.discountValue} onChange={handleInputChange} placeholder="e.g. 20" />
                </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <FormField label="Target Audience" required fieldName="targetAudience" errors={errors}>
                  <select className={`pp-input ${errors.targetAudience ? 'invalid-input' : ''}`} name="targetAudience" value={formData.targetAudience} onChange={handleInputChange}>
                    <option value="">Select Target Audience *</option>
                    <option value="ALL">All Customers</option>
                    <option value="NEW_CUSTOMER">New Customers Only</option>
                    <option value="REGULAR_CUSTOMER">Regular Customers Only</option>
                  </select>
                </FormField>
                <FormField label="Target Type" fieldName="targetType" errors={errors}>
                  <select className="pp-input" name="targetType" value={formData.targetType} onChange={handleInputChange}>
                    <option value="SHOP" disabled={hasActiveShopDeal}>
                      Entire Shop {hasActiveShopDeal ? '(Already Active)' : ''}
                    </option>
                    <option value="PRODUCT">Particular Product</option>
                  </select>
                </FormField>
            </div>

            {formData.targetType === 'PRODUCT' && (
              <FormField label="Select Target Product" required fieldName="targetProductId" errors={errors}>
                <select className={`pp-input ${errors.targetProductId ? 'invalid-input' : ''}`} name="targetProductId" value={formData.targetProductId} onChange={handleInputChange}>
                  <option value="">-- Choose a Product --</option>
                  {products.map(p => {
                    const isDisabled = activeProductDealIds.has(parseInt(p.id));
                    return (
                      <option key={p.id} value={p.id} disabled={isDisabled}>
                        {p.name} {isDisabled ? '(Deal Active)' : ''}
                      </option>
                    );
                  })}
                </select>
              </FormField>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <FormField label="Start Date & Time" required fieldName="startDate" errors={errors}>
                  <input className={`pp-input ${errors.startDate ? 'invalid-input' : ''}`} type="datetime-local" name="startDate" min={getLocalISOTime()} value={formData.startDate} onChange={handleInputChange} />
                </FormField>
                <FormField label="Expiry Date & Time" required fieldName="expiryDate" errors={errors}>
                  <input className={`pp-input ${errors.expiryDate ? 'invalid-input' : ''}`} type="datetime-local" name="expiryDate" min={formData.startDate || getLocalISOTime()} value={formData.expiryDate} onChange={handleInputChange} />
                </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <FormField label="Button Text" fieldName="buttonText" errors={errors}>
                  <input className="pp-input" type="text" name="buttonText" value={formData.buttonText} onChange={handleInputChange} />
                </FormField>
                <FormField label="Status" fieldName="isActive" errors={errors}>
                  <select className="pp-input" name="isActive" value={formData.isActive ? "true" : "false"} onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.value === 'true' }))}>
                    <option value="true">Active (Live)</option>
                    <option value="false">Inactive</option>
                  </select>
                </FormField>
            </div>

            <FormField label={`Banner Image ${!editingId ? '*' : '(Optional)'}`} fieldName="image" errors={errors}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input id="dealBannerImg" type="file" accept="image/*" hidden onChange={(e) => { setFile(e.target.files[0]); if(errors.image) setErrors(prev => ({...prev, image: ''})); }} />
                <button type="button" className="pp-btn-cancel" onClick={() => document.getElementById('dealBannerImg').click()}>
                   Choose Image
                </button>
                {file && <span style={{ fontSize: '13px', color: '#166534' }}>{file.name}</span>}
              </div>
            </FormField>
          </div>

          <div className="pp-form-actions">
            <button type="button" className="pp-btn-cancel" onClick={resetForm}>Cancel</button>
            <button type="submit" className="pp-btn-save" disabled={loading}>
              {loading ? 'Saving...' : editingId ? 'Update Live Deal' : 'Activate Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="pp-wrap">
      {confirmOpen && (
        <ConfirmDialog message={confirmMsg} onConfirm={handleConfirmYes} onCancel={handleConfirmNo} />
      )}

      <div className="pp-list-topbar">
        <div className="pp-list-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2>Deal of the Day</h2>
          <span className="pp-count-pill">{deals.length} total</span>
        </div>
        <button className="pp-btn-add" onClick={() => setPanel('form')}>+ Add Deal</button>
      </div>

      <div className="pp-table-card">
        <div className="pp-table-scroll">
          <table className="pp-table">
            <thead>
              <tr>
                <th>#</th><th>Preview</th><th>Title</th>
                <th>Discount</th><th>Target</th><th>Ends At</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fetchLoading ? (
                <tr><td colSpan="8"><div className="pp-empty">Loading...</div></td></tr>
              ) : deals.length > 0 ? paginatedDeals.map((d, i) => (
                <tr key={d.id || d._id}>
                  <td className="pp-td-num">{(safePage - 1) * ADMIN_PAGE_SIZE + i + 1}</td>
                  <td style={{ width: '100px' }}>
                    <img
                      src={`${IMG}${d.image}`} alt={d.title}
                      style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                    />
                  </td>
                  <td><span style={{ color: '#00044a', fontWeight: 600, fontSize: '13px' }}>{d.title || '—'}</span></td>
                  <td>
                    <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                      {d.discountType === 'FLAT' ? `₹${d.discountValue}` : `${d.discountValue || d.discountPercentage || 0}%`}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '11px', textTransform: 'capitalize', color: '#475569' }}>
                      {d.targetAudience === 'NEW_CUSTOMER' ? 'New' : d.targetAudience === 'REGULAR_CUSTOMER' ? 'Regular' : 'All'}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: '#475569' }}>
                    {d.expiryDate ? new Date(d.expiryDate).toLocaleString() : 'Never'}
                  </td>
                  <td>
                    <span style={d.isActive === false ? {background: '#f3f4f6', color: '#4b5563', padding: '2px 8px', borderRadius: '12px', fontSize: '12px'} : {background: '#dcfce3', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '12px'}}>
                      {d.isActive !== false ? 'Live' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="pp-action-btns">
                      <button className="pp-act-btn edit" onClick={() => handleEdit(d)} title="Edit">✏</button>
                      <button className="pp-act-btn del" onClick={() => handleDelete(d.id || d._id)} title="Delete">🗑</button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8">
                    <div className="pp-empty">
                      <div className="pp-empty-icon">⏳</div>
                      <div>No deals yet. Click "+ Add Deal" above to create one.</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination page={safePage} totalItems={deals.length} onPageChange={setCurrentPage} label="deals" />
      </div>
    </div>
  );
};

export default ManageDeals;
