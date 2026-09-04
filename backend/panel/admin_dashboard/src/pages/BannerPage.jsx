import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API, IMG } from '../config';
import { RiDeleteBin6Line } from 'react-icons/ri';
import AdminPagination, { ADMIN_PAGE_SIZE } from '../components/AdminPagination';

/* ── Custom Confirm Dialog ── */
const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div className="pp-confirm-overlay">
    <div className="pp-confirm-box">
      <div className="pp-confirm-icon">
        <RiDeleteBin6Line style={{ fontSize: '32px', color: '#ef4444' }} />
      </div>
      <p className="pp-confirm-msg">{message}</p>
      <div className="pp-confirm-actions">
        <button className="pp-confirm-cancel" onClick={onCancel}>Cancel</button>
        <button className="pp-confirm-ok" onClick={onConfirm}>Delete</button>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   Validators  (module-level — never recreated)
───────────────────────────────────────────── */
const validators = {
  title: (v) => (!v.trim() ? 'Banner title is required.' : ''),
  // image validated separately (file object, not string)
};

/* ─────────────────────────────────────────────
   FormField wrapper  (module-level — fixes focus-loss bug)
───────────────────────────────────────────── */
const FormField = ({ label, required, fieldName, errors, touched, children }) => {
  const state = !touched[fieldName] ? '' : errors[fieldName] ? 'invalid' : 'valid';
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

/* ─────────────────────────────────────────────
   BannerPage
───────────────────────────────────────────── */
const BannerPage = () => {
  const [banners, setBanners]       = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [panel, setPanel]           = useState('list');
  const [editId, setEditId]         = useState(null);
  const [title, setTitle]           = useState('');
  const [subtitle, setSubtitle]     = useState('');
  const [buttonText, setButtonText] = useState('Shop Now');
  const [link, setLink]             = useState('');
  const [status, setStatus]         = useState(true);
  const [imgFile, setImgFile]       = useState(null);
  const [imgPrev, setImgPrev]       = useState(null);
  const [saving, setSaving]         = useState(false);

  /* validation state */
  const [errors,  setErrors]  = useState({});
  const [touched, setTouched] = useState({});

  const [confirmOpen, setConfirmOpen]     = useState(false);
  const [confirmMsg, setConfirmMsg]       = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => { fetchBanners(); }, []);

  const fetchBanners = async () => {
    try { const r = await axios.get(`${API}/banners/all`); setBanners(r.data); }
    catch (e) { console.error(e); }
  };

  const resetForm = () => {
    setEditId(null); setTitle(''); setSubtitle('');
    setButtonText('Shop Now'); setLink('');
    setStatus(true);
    setImgFile(null); setImgPrev(null);
    setErrors({}); setTouched({});
    setPanel('list');
  };

  const openEdit = (b) => {
    setEditId(b.id); setTitle(b.title || ''); setSubtitle(b.subtitle || '');
    setButtonText(b.buttonText || 'Shop Now'); setLink(b.link || '');
    setStatus(b.status !== false);
    setImgPrev(IMG + b.image); setImgFile(null);
    setErrors({}); setTouched({});
    setPanel('form');
  };

  const REQ_WIDTH = 1682;
  const REQ_HEIGHT = 540;

  const handleImg = (e) => {
    const f = e.target.files[0]; 
    if (!f) return;

    // Strict 1682 x 540 px resolution validation
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;

        if (w !== REQ_WIDTH || h !== REQ_HEIGHT) {
          const errMsg = `Invalid image size (${w}×${h} px)! Only exact size 1682 × 540 px is accepted.`;
          toast.error(errMsg);
          setErrors((prev) => ({ ...prev, image: errMsg }));
          setImgFile(null);
          setImgPrev(null);
          e.target.value = ''; // Reset file input
          return;
        }

        // Passed exact size validation
        setImgFile(f);
        setImgPrev(event.target.result);
        setErrors((prev) => ({ ...prev, image: '' }));
        setTouched((prev) => ({ ...prev, image: true }));
        toast.success(`Banner image verified (${w}×${h} px) ✓`);
      };
      img.onerror = () => {
        toast.error("Failed to read image file.");
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(f);
  };

  /* blur for text inputs */
  const handleBlur = (field, value) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (validators[field]) {
      setErrors((prev) => ({ ...prev, [field]: validators[field](value) }));
    }
  };

  /* change for text inputs */
  const handleChange = (field, value, setter) => {
    setter(value);
    if (touched[field] && validators[field]) {
      setErrors((prev) => ({ ...prev, [field]: validators[field](value) }));
    }
  };

  /* confirm dialog */
  const showConfirm = (message, action) => {
    setConfirmMsg(message);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };
  const handleConfirmYes = () => { setConfirmOpen(false); confirmAction?.(); };
  const handleConfirmNo  = () => { setConfirmOpen(false); setConfirmAction(null); };

  /* submit */
  const handleSubmit = async (e) => {
    e.preventDefault();

    /* touch all validated fields */
    const newTouched = { title: true, image: true };
    setTouched(newTouched);

    /* build errors */
    const newErrors = {
      title: validators.title(title),
      image: (!editId && !imgFile) ? 'Banner image is required.' : '',
    };
    setErrors(newErrors);

    const hasError = Object.values(newErrors).some(Boolean);
    if (hasError) {
      if (newErrors.title) toast.error(newErrors.title);
      if (newErrors.image) toast.error(newErrors.image);
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('subtitle', subtitle);
      fd.append('buttonText', buttonText || 'Shop Now');
      fd.append('link', link);
      fd.append('status', status);
      if (imgFile) fd.append('image', imgFile);

      if (editId) {
        await axios.put(`${API}/banners/update/${editId}`, fd);
        toast.success('Banner updated successfully!');
      } else {
        await axios.post(`${API}/banners/add`, fd);
        toast.success('Banner added successfully!');
      }
      await fetchBanners();
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    }
    setSaving(false);
  };

  const deleteBanner = (id, bannerTitle) => {
    showConfirm(
      `Delete "${bannerTitle || 'this banner'}"? This cannot be undone.`,
      async () => {
        try {
          await axios.delete(`${API}/banners/delete/${id}`);
          toast.success('Banner deleted successfully!');
          fetchBanners();
        } catch (err) {
          toast.error('Delete failed: ' + (err.response?.data?.message || err.message));
        }
      }
    );
  };

  /* ── image field state ── */
  const imgState = !touched.image ? '' : errors.image ? 'invalid' : 'valid';

  /* ── FORM PANEL ── */
  if (panel === 'form') return (
    <div className="pp-wrap">
      {confirmOpen && (
        <ConfirmDialog message={confirmMsg} onConfirm={handleConfirmYes} onCancel={handleConfirmNo} />
      )}

      <div className="pp-form-topbar">
        <button className="pp-back-btn" onClick={resetForm}>← Back</button>
        <h2 className="pp-form-title">{editId ? 'Edit Banner' : 'New Banner'}</h2>
      </div>

      <div style={{ maxWidth: '580px' }}>
        <form onSubmit={handleSubmit} noValidate>
          <div className="pp-section-card">
            <div className="pp-section-label">Banner Details</div>

            {/* Title — required */}
            <FormField label="Banner Title" required fieldName="title" errors={errors} touched={touched}>
              <input
                className={`pp-input ${touched.title && errors.title ? 'invalid-input' : ''}`}
                placeholder="e.g. Summer Collection 2026"
                value={title}
                onChange={(e) => handleChange('title', e.target.value, setTitle)}
                onBlur={(e) => handleBlur('title', e.target.value)}
              />
            </FormField>

            {/* Subtitle — optional */}
            <div className="pp-field">
              <label className="pp-price-label">Subtitle / Description <span className="pp-optional">(optional)</span></label>
              <input
                className="pp-input"
                placeholder="e.g. Upto 50% off on all items"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
              />
            </div>

            {/* Button Text — optional */}
            <div className="pp-field">
              <label className="pp-price-label">Button Text <span className="pp-optional">(optional)</span></label>
              <input
                className="pp-input"
                placeholder="Shop Now"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
              />
            </div>

            {/* Link — optional */}
            <div className="pp-field">
              <label className="pp-price-label">Link URL <span className="pp-optional">(optional)</span></label>
              <input
                className="pp-input"
                placeholder="https://... or /shop"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </div>

            {/* Status */}
            <div className="pp-field">
              <label className="pp-price-label">Status</label>
              <select
                className="pp-input"
                value={status ? 'true' : 'false'}
                onChange={e => setStatus(e.target.value === 'true')}
              >
                <option value="true">Active (Public)</option>
                <option value="false">Inactive (Hidden)</option>
              </select>
            </div>

            {/* Image — required on Add, optional on Edit */}
            <div className={`pp-field pp-field--state-${imgState}`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="pp-price-label" style={{ margin: 0 }}>
                  Banner Image {!editId && <span style={{ color: '#ef4444' }}>*</span>}
                  {editId && <span className="pp-optional"> (leave blank to keep current)</span>}
                </label>
                <span style={{ 
                  fontSize: '0.78rem', 
                  fontWeight: 700, 
                  color: '#2d5a1b', 
                  background: '#ecfdf5', 
                  border: '1px solid #bbf7d0', 
                  padding: '3px 10px', 
                  borderRadius: '12px',
                  letterSpacing: '0.3px'
                }}>
                  📐 Recommended Size: 1682 × 540 px
                </span>
              </div>
              <div
                className={`pp-main-upload-area ${imgState === 'invalid' ? 'invalid-input' : ''}`}
                style={{ aspectRatio: '1682/540', maxHeight: '280px' }}
                onClick={() => document.getElementById('bannerImg').click()}
              >
                {imgPrev
                  ? <img src={imgPrev} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (
                    <div className="pp-upload-placeholder">
                      <span style={{ fontSize: '28px' }}>⬆</span>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Click to upload banner image</span>
                      <span style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: 700, 
                        color: '#2d5a1b', 
                        background: '#e6f4ea', 
                        padding: '3px 10px', 
                        borderRadius: '6px',
                        marginTop: '6px',
                        display: 'inline-block'
                      }}>
                        Highlighted Size: 1682 × 540 px
                      </span>
                    </div>
                  )
                }
              </div>
              <input id="bannerImg" type="file" accept="image/*" hidden onChange={handleImg} />
              {imgState === 'invalid' && errors.image && (
                <span className="error-msg">{errors.image}</span>
              )}
              {imgState === 'valid' && (
                <span className="pp-field-success" style={{ display: 'inline-block', marginTop: '6px' }}>✓ Image selected</span>
              )}
            </div>

          </div>

          <div className="pp-form-actions">
            <button type="button" className="pp-btn-cancel" onClick={resetForm}>Cancel</button>
            <button type="submit" className="pp-btn-save" disabled={saving}>
              {saving ? 'Saving...' : editId ? 'Update Banner' : 'Add Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  /* ── LIST PANEL ── */
  const totalPages = Math.max(1, Math.ceil(banners.length / ADMIN_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBanners = banners.slice((safePage - 1) * ADMIN_PAGE_SIZE, safePage * ADMIN_PAGE_SIZE);

  return (
    <div className="pp-wrap">
      {confirmOpen && (
        <ConfirmDialog message={confirmMsg} onConfirm={handleConfirmYes} onCancel={handleConfirmNo} />
      )}

      <div className="pp-list-topbar">
        <div className="pp-list-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2>Banners</h2>
          <span className="pp-count-pill">{banners.length} total</span>
          <span style={{ 
            fontSize: '0.8rem', 
            fontWeight: 700, 
            color: '#2d5a1b', 
            background: '#ecfdf5', 
            border: '1px solid #bbf7d0', 
            padding: '4px 12px', 
            borderRadius: '20px' 
          }}>
           Recommended Banner Size: 1682 × 540 px
          </span>
        </div>
        <button className="pp-btn-add" onClick={() => setPanel('form')}>+ Add Banner</button>
      </div>

      <div className="pp-table-card">
        <div className="pp-table-scroll">
          <table className="pp-table">
            <thead>
              <tr>
                <th>#</th><th>Preview</th><th>Title</th>
                <th>Subtitle</th><th>Status</th><th>Button</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {banners.length > 0 ? paginatedBanners.map((b, i) => (
                <tr key={b.id}>
                  <td className="pp-td-num">{(safePage - 1) * ADMIN_PAGE_SIZE + i + 1}</td>
                  <td style={{ width: '120px' }}>
                    <img
                      src={IMG + b.image} alt={b.title}
                      style={{ width: '110px', height: '55px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #222' }}
                    />
                  </td>
                  <td><span style={{ color: '#00044a', fontWeight: 500 }}>{b.title || '—'}</span></td>
                  <td style={{ color: '#00044a', fontSize: '12px', maxWidth: '180px' }}>{b.subtitle || '—'}</td>
                  <td>
                    <span style={b.status === false ? {background: '#f3f4f6', color: '#4b5563', padding: '2px 8px', borderRadius: '12px', fontSize: '12px'} : {background: '#dcfce3', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '12px'}}>
                      {b.status !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td><span className="pp-cat-badge">{b.buttonText || 'Shop Now'}</span></td>
                  <td>
                    <div className="pp-action-btns">
                      <button className="pp-act-btn edit" onClick={() => openEdit(b)} title="Edit">✏</button>
                      <button className="pp-act-btn del" onClick={() => deleteBanner(b.id, b.title)} title="Delete">🗑</button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7">
                    <div className="pp-empty">
                      <div className="pp-empty-icon">🖼</div>
                      <div>No banners yet. Add your first one!</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination page={safePage} totalItems={banners.length} onPageChange={setCurrentPage} label="banners" />
      </div>
    </div>
  );
};

export default BannerPage;
