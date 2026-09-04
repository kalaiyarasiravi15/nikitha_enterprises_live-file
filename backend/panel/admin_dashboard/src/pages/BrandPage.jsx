import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './BrandPage.css';

import { API, IMG } from '../config';
const PER_PAGE = 10;

const BrandPage = () => {
  const [brands, setBrands]         = useState([]);
  const [panel, setPanel]           = useState('list');
  const [editId, setEditId]         = useState(null);
  const [viewData, setViewData]     = useState(null);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);

  const [name, setName]                 = useState('');
  const [description, setDescription]   = useState('');
  const [image, setImage]               = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving]             = useState(false);
  const [errors, setErrors]             = useState({});
  const [deleting, setDeleting]         = useState(null);

  // ── confirm-delete modal state ──
  const [confirmId, setConfirmId]     = useState(null);
  const [confirmName, setConfirmName] = useState('');

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const res = await axios.get(`${API}/brands/all`);
      setBrands(res.data);
    } catch (err) {
      toast.error('Failed to load brands.');
      console.error(err);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setName('');
    setDescription('');
    setImage(null);
    setImagePreview(null);
    setErrors({});
    setPanel('list');
  };

  const openAdd  = () => { resetForm(); setPanel('form'); };

  const openEdit = (brand) => {
    setEditId(brand.id);
    setName(brand.name || '');
    setDescription(brand.description || '');
    setImagePreview(brand.image ? IMG + brand.image : null);
    setImage(null);
    setErrors({});
    setPanel('form');
  };

  const openView = (brand) => { setViewData(brand); setPanel('view'); };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    if (errors.image) setErrors(prev => ({ ...prev, image: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = 'Brand Name is required.';
      toast.error('Brand Name is required.');
    }
    if (!image && !imagePreview) {
      newErrors.image = 'Brand Logo is required.';
      toast.error('Brand Logo is required.');
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('description', description);
      if (image) fd.append('image', image);

      if (editId) {
        await axios.put(`${API}/brands/update/${editId}`, fd);
        toast.success(`"${name}" updated successfully!`);
      } else {
        await axios.post(`${API}/brands/add`, fd);
        toast.success(`"${name}" added successfully!`);
      }
      await fetchBrands();
      resetForm();
      setPage(1);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error saving. Check backend connection.';
      toast.error(`${msg}`);
    }
    setSaving(false);
  };

  // step 1: open inline confirm instead of browser alert
  const handleDeleteClick = (brand) => {
    setConfirmId(brand.id);
    setConfirmName(brand.name);
  };

  // step 2: user confirmed → delete
  const handleDeleteConfirm = async () => {
    const id   = confirmId;
    const bname = confirmName;
    setConfirmId(null);
    setConfirmName('');
    setDeleting(id);
    try {
      await axios.delete(`${API}/brands/delete/${id}`);
      await fetchBrands();
      toast.success(`"${bname}" deleted successfully!`);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Delete failed. Try again.';
      toast.error(`${msg}`);
    }
    setDeleting(null);
  };

  const handleDeleteCancel = () => {
    setConfirmId(null);
    setConfirmName('');
    toast.info('Delete cancelled.');
  };

  const filtered   = brands.filter(b => b.name?.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
  const safePage   = page > totalPages ? 1 : page;
  const current    = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
    .reduce((acc, n, i, arr) => {
      if (i > 0 && n - arr[i - 1] > 1) acc.push('...');
      acc.push(n);
      return acc;
    }, []);

  // ── FORM ──
  if (panel === 'form') return (
    <div className="bp-wrap">
      <div className="bp-form-topbar">
        <button className="bp-back-btn" onClick={resetForm}>← Back</button>
        <h2 className="bp-form-title">{editId ? 'Edit Brand' : 'New Brand'}</h2>
      </div>

      <div className="bp-form-card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="bp-section-label">Brand Info</div>

          <div className="bp-form-group">
            <label className="bp-field-label">Brand Name *</label>
            <input
              className={`bp-input ${errors.name ? 'invalid-input' : ''}`}
              placeholder="e.g. Brand Name..."
              value={name}
              onChange={e => {
                setName(e.target.value);
                if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
              }}
            />
            {errors.name && <span className="error-msg">{errors.name}</span>}
          </div>

          <div className="bp-form-group">
            <label className="bp-field-label">Description</label>
            <textarea
              className="bp-input"
              placeholder="Brand description..."
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ padding: '12px', resize: 'vertical' }}
            />
          </div>

          <div className="bp-form-group">
            <label className="bp-field-label">Brand Logo / Image *</label>
            <div className={`bp-upload-area ${errors.image ? 'invalid-input' : ''}`} onClick={() => document.getElementById('brandImgInput').click()}>
              {imagePreview
                ? <img src={imagePreview} alt="preview" className="bp-upload-preview" />
                : (
                  <div className="bp-upload-placeholder">
                    <span className="bp-upload-icon">⬆</span>
                    <span>Click to upload logo</span>
                  </div>
                )
              }
            </div>
            {errors.image && <span className="error-msg">{errors.image}</span>}
            <input id="brandImgInput" type="file" accept="image/*" hidden onChange={handleImageChange} />
            {imagePreview && (
              <button type="button" className="bp-remove-img" onClick={() => { setImage(null); setImagePreview(null); if (errors.image) setErrors(prev => ({ ...prev, image: '' })); }}>
                ✕ Remove logo
              </button>
            )}
          </div>

          <div className="bp-form-actions">
            <button type="button" className="bp-btn-cancel" onClick={resetForm}>Discard</button>
            <button type="submit" className="bp-btn-save" disabled={saving}>
              {saving ? 'Saving...' : (editId ? 'Update Brand' : 'Add Brand')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // ── VIEW ──
  if (panel === 'view' && viewData) return (
    <div className="bp-wrap">
      <div className="bp-form-topbar">
        <button className="bp-back-btn" onClick={() => { setViewData(null); setPanel('list'); }}>← Back</button>
        <h2 className="bp-form-title">Brand Detail</h2>
        <button className="bp-btn-edit-top" onClick={() => openEdit(viewData)}>✏ Edit</button>
      </div>

      <div className="bp-view-card">
        <div className="bp-view-img-wrap">
          {viewData.image
            ? <img src={IMG + viewData.image} className="bp-view-img" alt={viewData.name} onError={e => e.target.style.display='none'} />
            : <div className="bp-view-no-img">No Image</div>
          }
        </div>
        <div className="bp-view-info">
          <div className="bp-view-badge">Brand</div>
          <h2 className="bp-view-name">{viewData.name}</h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '8px 0 16px' }}>{viewData.description || 'No description provided.'}</p>
          <div className="bp-view-meta">
            <div className="bp-view-meta-item">
              <span>Brand ID</span>
              <strong>#{viewData.id}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── TABLE LIST ──
  return (
    <div className="bp-wrap">

      {/* ── Inline Delete Confirm Modal ── */}
      {confirmId && (
        <div className="bp-modal-overlay">
          <div className="bp-modal">
            <div className="bp-modal-icon">🗑️</div>
            <h3 className="bp-modal-title">Delete Brand?</h3>
            <p className="bp-modal-msg">
              You're about to delete <strong>"{confirmName}"</strong>.<br />
              This action cannot be undone.
            </p>
            <div className="bp-modal-actions">
              <button className="bp-modal-cancel" onClick={handleDeleteCancel}>Cancel</button>
              <button className="bp-modal-confirm" onClick={handleDeleteConfirm}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="bp-list-topbar">
        <div className="bp-list-title">
          <h2>Brands</h2>
          <span className="bp-count-pill">{filtered.length} total</span>
        </div>
        <div className="bp-list-actions">
          <div className="bp-search-box">
            <span className="bp-search-icon">⌕</span>
            <input
              placeholder="Search brands..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button className="bp-btn-add" onClick={openAdd}>+ Add Brand</button>
        </div>
      </div>

      <div className="bp-table-card">
        <div className="bp-table-scroll">
          <table className="bp-table">
            <thead>
              <tr>
                <th style={{ width: '80px', textAlign: 'center' }}>ID</th>
                <th style={{ width: '100px' }}>Logo</th>
                <th>Brand Name</th>
                <th>Description</th>
                <th style={{ width: '180px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {current.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="bp-empty">
                      <div className="bp-empty-icon">⊞</div>
                      <div>{search ? 'No brands match your search.' : 'No brands yet. Add your first one!'}</div>
                    </div>
                  </td>
                </tr>
              ) : (
                current.map(b => (
                  <tr key={b.id} style={{ opacity: deleting === b.id ? 0.4 : 1 }}>
                    <td className="bp-td-num">#{b.id}</td>
                    <td className="bp-td-img">
                      {b.image
                        ? <img src={IMG + b.image} alt={b.name} className="bp-tbl-img" />
                        : <div className="bp-tbl-no-img">No Image</div>
                      }
                    </td>
                    <td className="bp-td-name">
                      <span className="bp-name-main">{b.name}</span>
                    </td>
                    <td>
                      <div style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.description || '—'}
                      </div>
                    </td>
                    <td>
                      <div className="bp-action-btns">
                        <button className="bp-act-btn view" onClick={() => openView(b)} title="View Details">👁</button>
                        <button className="bp-act-btn edit" onClick={() => openEdit(b)} title="Edit">✏</button>
                        <button className="bp-act-btn del" onClick={() => handleDeleteClick(b)} title="Delete" disabled={deleting === b.id}>
                          {deleting === b.id ? '⏳' : '🗑'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="bp-pagination">
            <span className="bp-page-info">
              Showing {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, filtered.length)} of {filtered.length} brands
            </span>
            <div className="bp-page-btns">
              <button disabled={safePage === 1} onClick={() => setPage(1)} title="First">«</button>
              <button disabled={safePage === 1} onClick={() => setPage(p => p - 1)} title="Previous">‹</button>
              {pageNumbers.map((n, i) =>
                n === '...'
                  ? <span key={`d-${i}`} className="bp-dots">…</span>
                  : <button key={n} className={safePage === n ? 'active' : ''} onClick={() => setPage(n)}>{n}</button>
              )}
              <button disabled={safePage === totalPages} onClick={() => setPage(p => p + 1)} title="Next">›</button>
              <button disabled={safePage === totalPages} onClick={() => setPage(totalPages)} title="Last">»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandPage;
