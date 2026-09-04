import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { API, IMG } from '../config';
import AdminPagination, { ADMIN_PAGE_SIZE } from '../components/AdminPagination';

const OFFER_BANNERS_API = `${API}/offer-banners`;

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

const ManageOfferBanners = () => {
  const [banners, setBanners]           = useState([]);
  const [products, setProducts]         = useState([]);
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

  const [formData, setFormData] = useState({
    title:          '',
    subtitle:       '',
    buttonText:     'SHOP NOW',
    link:           '',
    discountTag:    '',
    productId:      '',
    startDate:      '',
    expiryDate:     '',
    status:         true,
    discountType:   '',
    discountValue:  '',
    targetAudience: ''
  });

  const fetchBanners = useCallback(async () => {
    setFetchLoading(true);
    try {
      const res = await axios.get(`${OFFER_BANNERS_API}/admin/all`);
      setBanners(res.data || []);
    } catch (err) {
      console.error("Fetch banners error:", err.message);
    } finally {
      setFetchLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/products/all`);
      setProducts(res.data || []);
    } catch (err) {
      console.error("Fetch products error:", err.message);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
    fetchProducts();
  }, [fetchBanners, fetchProducts]);

  const totalPages = Math.max(1, Math.ceil(banners.length / ADMIN_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBanners = banners.slice((safePage - 1) * ADMIN_PAGE_SIZE, safePage * ADMIN_PAGE_SIZE);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleProductChange = (e) => {
    const pid = e.target.value;
    const selectedProd = products.find(p => String(p.id) === String(pid));
    setFormData(prev => ({
      ...prev,
      productId: pid,
      link: selectedProd ? `/product/${selectedProd.id}` : ''
    }));
    if (errors.productId) setErrors(prev => ({ ...prev, productId: '' }));
    if (errors.link) setErrors(prev => ({ ...prev, link: '' }));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title:          '',
      subtitle:       '',
      buttonText:     'SHOP NOW',
      link:           '',
      discountTag:    '',
      productId:      '',
      startDate:      '',
      expiryDate:     '',
      status:         true,
      discountType:   '',
      discountValue:  '',
      targetAudience: ''
    });
    setFile(null);
    setErrors({});
    setPanel('list');
  };

  const handleEdit = (banner) => {
    setEditingId(banner.id || banner._id);
    setFormData({
      title:          banner.title,
      subtitle:       banner.subtitle || '',
      buttonText:     banner.buttonText || 'SHOP NOW',
      link:           banner.link || '',
      discountTag:    banner.discountTag || '',
      productId:      banner.productId || '',
      startDate:      banner.startDate ? new Date(banner.startDate).toISOString().slice(0, 16) : '',
      expiryDate:     banner.expiryDate ? new Date(banner.expiryDate).toISOString().slice(0, 16) : '',
      status:         banner.status !== undefined ? banner.status : true,
      discountType:   banner.discountType || '',
      discountValue:  banner.discountValue !== undefined ? banner.discountValue : '',
      targetAudience: banner.targetAudience || ''
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

    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Offer Title is required.';
    }
    if (!formData.subtitle.trim()) {
      newErrors.subtitle = 'Subtitle/Description is required.';
    }
    if (!formData.discountTag.trim()) {
      newErrors.discountTag = 'Discount Tag is required.';
    }
    if (!formData.productId) {
      newErrors.productId = 'Product Selection is required.';
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
    if (!file && !editingId) {
      newErrors.image = 'Banner Image is required.';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
        toast.error("Please fill all required fields correctly.");
        return;
    }

    setLoading(true);
    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    if (file) data.append('image', file);

    try {
      if (editingId) {
        await axios.put(`${OFFER_BANNERS_API}/update/${editingId}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success("Offer Banner updated successfully!");
      } else {
        await axios.post(`${OFFER_BANNERS_API}/add`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success("New Offer Banner activated!");
      }
      resetForm();
      fetchBanners();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    showConfirm(
      "Remove this Offer Banner from the live site?",
      async () => {
        try {
          await axios.delete(`${OFFER_BANNERS_API}/delete/${id}`);
          toast.success("Offer Banner removed successfully!");
          fetchBanners();
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
        <h2 className="pp-form-title">{editingId ? 'Edit Offer Banner' : 'New Offer Banner'}</h2>
      </div>

      <div style={{ maxWidth: '650px' }}>
        <form onSubmit={handleSubmit} noValidate>
          <div className="pp-section-card">
            <div className="pp-section-label">Offer Details</div>

            <FormField label="Offer Title" required fieldName="title" errors={errors}>
              <input className={`pp-input ${errors.title ? 'invalid-input' : ''}`} type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g. Healthy Cooking" />
            </FormField>

            <FormField label="Subtitle / Description" required fieldName="subtitle" errors={errors}>
              <input className={`pp-input ${errors.subtitle ? 'invalid-input' : ''}`} type="text" name="subtitle" value={formData.subtitle} onChange={handleInputChange} placeholder="e.g. Brass retains nutrients..." />
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <FormField label="Discount Tag" required fieldName="discountTag" errors={errors}>
                  <input className={`pp-input ${errors.discountTag ? 'invalid-input' : ''}`} type="text" name="discountTag" value={formData.discountTag} onChange={handleInputChange} placeholder="e.g. Bestseller" />
                </FormField>
                <FormField label="Target Audience" required fieldName="targetAudience" errors={errors}>
                  <select className={`pp-input ${errors.targetAudience ? 'invalid-input' : ''}`} name="targetAudience" value={formData.targetAudience} onChange={handleInputChange}>
                    <option value="">Select Audience *</option>
                    <option value="ALL">All Customers</option>
                    <option value="NEW_CUSTOMER">New Customers Only</option>
                    <option value="REGULAR_CUSTOMER">Regular Customers Only</option>
                  </select>
                </FormField>
            </div>

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

            <FormField label="Product Selection" required fieldName="productId" errors={errors}>
              <select className={`pp-input ${errors.productId ? 'invalid-input' : ''}`} name="productId" value={formData.productId} onChange={handleProductChange}>
                <option value="">Select a Product *</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </FormField>

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
                <FormField label="Status" fieldName="status" errors={errors}>
                  <select className="pp-input" name="status" value={formData.status ? "true" : "false"} onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value === 'true' }))}>
                    <option value="true">Active (Live)</option>
                    <option value="false">Inactive</option>
                  </select>
                </FormField>
            </div>

            <FormField label={`Banner Image ${!editingId ? '*' : '(Optional)'}`} fieldName="image" errors={errors}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input id="offerBannerImg" type="file" accept="image/*" hidden onChange={(e) => { setFile(e.target.files[0]); if(errors.image) setErrors(prev => ({...prev, image: ''})); }} />
                <button type="button" className="pp-btn-cancel" onClick={() => document.getElementById('offerBannerImg').click()}>
                   Choose Image
                </button>
                {file && <span style={{ fontSize: '13px', color: '#166534' }}>{file.name}</span>}
              </div>
            </FormField>
          </div>

          <div className="pp-form-actions">
            <button type="button" className="pp-btn-cancel" onClick={resetForm}>Cancel</button>
            <button type="submit" className="pp-btn-save" disabled={loading}>
              {loading ? 'Saving...' : editingId ? 'Update Offer Banner' : 'Activate Offer Banner'}
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
          <h2>Deal / Offer Banners</h2>
          <span className="pp-count-pill">{banners.length} total</span>
        </div>
        <button className="pp-btn-add" onClick={() => setPanel('form')}>+ Add Deal Offer</button>
      </div>

      <div className="pp-table-card">
        <div className="pp-table-scroll">
          <table className="pp-table">
            <thead>
              <tr>
                <th>#</th><th>Preview</th><th>Title</th>
                <th>Discount</th><th>Audience</th><th>Ends At</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fetchLoading ? (
                <tr><td colSpan="8"><div className="pp-empty">Loading...</div></td></tr>
              ) : banners.length > 0 ? paginatedBanners.map((b, i) => (
                <tr key={b.id || b._id}>
                  <td className="pp-td-num">{(safePage - 1) * ADMIN_PAGE_SIZE + i + 1}</td>
                  <td style={{ width: '100px' }}>
                    <img
                      src={`${IMG}${b.image}`} alt={b.title}
                      style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                    />
                  </td>
                  <td><span style={{ color: '#00044a', fontWeight: 600, fontSize: '13px' }}>{b.title || '—'}</span></td>
                  <td>
                    <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                      {b.discountType === 'FLAT' ? `₹${b.discountValue}` : `${b.discountValue}%`}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '11px', textTransform: 'capitalize', color: '#475569' }}>
                      {b.targetAudience === 'NEW_CUSTOMER' ? 'New' : b.targetAudience === 'REGULAR_CUSTOMER' ? 'Regular' : 'All'}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: '#475569' }}>
                    {b.expiryDate ? new Date(b.expiryDate).toLocaleString() : 'Never'}
                  </td>
                  <td>
                    <span style={b.status === false ? {background: '#f3f4f6', color: '#4b5563', padding: '2px 8px', borderRadius: '12px', fontSize: '12px'} : {background: '#dcfce3', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '12px'}}>
                      {b.status !== false ? 'Live' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="pp-action-btns">
                      <button className="pp-act-btn edit" onClick={() => handleEdit(b)} title="Edit">✏</button>
                      <button className="pp-act-btn del" onClick={() => handleDelete(b.id || b._id)} title="Delete">🗑</button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8">
                    <div className="pp-empty">
                      <div className="pp-empty-icon">🏷️</div>
                      <div>No offer banners yet. Click "+ Add Deal Offer" above to create one.</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination page={safePage} totalItems={banners.length} onPageChange={setCurrentPage} label="offer banners" />
      </div>
    </div>
  );
};

export default ManageOfferBanners;
