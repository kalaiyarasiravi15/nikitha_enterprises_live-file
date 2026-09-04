import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API, IMG } from '../config';
import { RiSave2Fill, RiRefreshLine, RiAddLine, RiDeleteBinLine, RiImageAddFill } from 'react-icons/ri';
import './PageSettings.css';

const defaultAboutData = {
  heroImage: '/herobanner.png',
  storySubtitle: '',
  storyParagraphs: '',
  storyImage: '',
  stats: [],
  missionSubtitle: '',
  missionParagraphs: '',
  missionImage: '',
  storeIntro: '',
  storeGrid: [
    { title: 'Cookware', desc: 'Premium cookware crafted for everyday Indian cooking.' },
    { title: 'Kitchen Tools', desc: 'Precision tools designed to simplify every cooking task.' },
    { title: 'Servingware', desc: 'Elegant serving pieces for every occasion at home.' },
    { title: 'Storage Solutions', desc: 'Smart storage that keeps your kitchen clean and organised.' }
  ],
  faqIntro: '',
  faqs: [],
  faqImage: '',
  instaImages: []
};

const resolveUploadedImage = (value) => {
  if (!value || value.startsWith('http')) return value;
  const fileName = value.replace(/^\/?uploads\//, '');
  return `${IMG.replace(/\/$/, '')}/${fileName}`;
};

const AboutPageSettings = () => {
  const [formData, setFormData] = useState(defaultAboutData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/settings`);
      if (res.data && res.data.success && res.data.data.ABOUT_PAGE_DATA) {
        try {
          const parsed = JSON.parse(res.data.data.ABOUT_PAGE_DATA);
          setFormData(prev => ({ ...prev, ...parsed }));
        } catch (e) { console.error("Error parsing ABOUT_PAGE_DATA", e); }
      }
    } catch (err) {
      toast.error('Failed to load about settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.put(`${API}/settings`, {
        ABOUT_PAGE_DATA: JSON.stringify(formData)
      });
      if (res.data && res.data.success) {
        toast.success('About page settings saved successfully!');
      } else {
        toast.error('Failed to save settings.');
      }
    } catch (err) {
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field, index, subfield, value) => {
    const newArray = [...formData[field]];
    newArray[index][subfield] = value;
    setFormData(prev => ({ ...prev, [field]: newArray }));
  };

  const handleArrayStringChange = (field, index, value) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData(prev => ({ ...prev, [field]: newArray }));
  };

  const addArrayItem = (field, defaultObj) => {
    setFormData(prev => ({ ...prev, [field]: [...prev[field], defaultObj] }));
  };

  const removeArrayItem = (field, index) => {
    const newArray = [...formData[field]];
    newArray.splice(index, 1);
    setFormData(prev => ({ ...prev, [field]: newArray }));
  };

  const handleImageUpload = async (file, callback) => {
    if (!file) return;
    const data = new FormData();
    data.append('images', file);
    setUploadingImage(true);
    try {
      const res = await axios.post(`${API}/settings/upload`, data);
      if (res.data && res.data.success) {
        callback(res.data.imageUrl);
        toast.success("Image uploaded!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Image upload failed.');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="ps-page">
      <div className="ps-header">
        <div>
          <h1 className="ps-title">About Page Editor</h1>
          <p className="ps-subtitle">Customize the content and imagery for the About Us page</p>
        </div>
        <button type="button" className="ps-add-btn" style={{width:'auto'}} onClick={fetchSettings} disabled={loading || saving}>
          <RiRefreshLine className={loading ? 'sp-spin' : ''} /> Reload
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <form onSubmit={handleSave}>
          <div className="ps-card">
            <h2 className="ps-card-title">Our Story</h2>
            
            <div className="ps-group">
              <label className="ps-label">Our Story Subtitle</label>
              <input className="ps-input" value={formData.storySubtitle} onChange={e => handleChange('storySubtitle', e.target.value)} />
            </div>

            <div className="ps-group">
              <label className="ps-label">Our Story Text (Paragraphs separated by empty lines)</label>
              <textarea className="ps-input" value={formData.storyParagraphs} onChange={e => handleChange('storyParagraphs', e.target.value)} />
            </div>

            <div className="ps-group">
              <label className="ps-label">Our Story Side Image</label>
              <div className="ps-image-upload-wrapper">
                {formData.storyImage && <img src={resolveUploadedImage(formData.storyImage)} alt="Preview" className="ps-image-preview" onError={(e) => e.target.style.display='none'} />}
                <div style={{flex:1}}>
                  <label className={`ps-upload-btn ${uploadingImage ? 'disabled' : ''}`}>
                    <RiImageAddFill /> {uploadingImage ? 'Uploading...' : 'Upload Image'}
                    <input type="file" hidden accept="image/*" onChange={e => handleImageUpload(e.target.files[0], val => handleChange('storyImage', val))} disabled={uploadingImage} />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="ps-card">
            <h2 className="ps-card-title">Our Mission</h2>
            
            <div className="ps-group">
              <label className="ps-label">Mission Subtitle</label>
              <input className="ps-input" value={formData.missionSubtitle} onChange={e => handleChange('missionSubtitle', e.target.value)} />
            </div>

            <div className="ps-group">
              <label className="ps-label">Mission Text (Paragraphs separated by empty lines)</label>
              <textarea className="ps-input" value={formData.missionParagraphs} onChange={e => handleChange('missionParagraphs', e.target.value)} />
            </div>

            <div className="ps-group">
              <label className="ps-label">Mission Side Image</label>
              <div className="ps-image-upload-wrapper">
                {formData.missionImage && <img src={resolveUploadedImage(formData.missionImage)} alt="Preview" className="ps-image-preview" onError={(e) => e.target.style.display='none'} />}
                <div style={{flex:1}}>
                  <label className={`ps-upload-btn ${uploadingImage ? 'disabled' : ''}`}>
                    <RiImageAddFill /> {uploadingImage ? 'Uploading...' : 'Upload Image'}
                    <input type="file" hidden accept="image/*" onChange={e => handleImageUpload(e.target.files[0], val => handleChange('missionImage', val))} disabled={uploadingImage} />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="ps-card">
            <h2 className="ps-card-title">Statistics (e.g. 15+ Years)</h2>
            <div className="ps-dynamic-list">
              {formData.stats.map((stat, i) => (
                <div key={i} className="ps-dynamic-item ps-row">
                  <input className="ps-input" style={{flex:0.3}} placeholder="Value (e.g. 15+)" value={stat.value} onChange={e => handleArrayChange('stats', i, 'value', e.target.value)} />
                  <input className="ps-input" style={{flex:0.7}} placeholder="Label (e.g. Years of Experience)" value={stat.label} onChange={e => handleArrayChange('stats', i, 'label', e.target.value)} />
                  <button type="button" className="ps-delete-btn" onClick={() => removeArrayItem('stats', i)}><RiDeleteBinLine /></button>
                </div>
              ))}
            </div>
            {formData.stats.length < 4 && (
              <button type="button" className="ps-add-btn" onClick={() => addArrayItem('stats', {value:'', label:''})}><RiAddLine /> Add Stat Row</button>
            )}
          </div>

          <div className="ps-card">
            <h2 className="ps-card-title">Inside Our Store (Text Only)</h2>
            <div className="ps-group">
              <label className="ps-label">Intro Text</label>
              <textarea className="ps-input" style={{minHeight:'60px'}} value={formData.storeIntro} onChange={e => handleChange('storeIntro', e.target.value)} />
            </div>
            
            <div className="ps-dynamic-list">
              {formData.storeGrid.map((item, i) => (
                <div key={i} className="ps-dynamic-item">
                  <input className="ps-input" placeholder={`Card ${i+1} Title (e.g. Cookware)`} value={item.title} onChange={e => handleArrayChange('storeGrid', i, 'title', e.target.value)} style={{marginBottom:'10px'}} />
                  <input className="ps-input" placeholder={`Card ${i+1} Description`} value={item.desc} onChange={e => handleArrayChange('storeGrid', i, 'desc', e.target.value)} style={{marginBottom:'10px'}} />
                </div>
              ))}
            </div>
          </div>

          <div className="ps-card">
            <h2 className="ps-card-title">FAQs</h2>
            <div className="ps-group">
              <label className="ps-label">FAQ Intro Text</label>
              <textarea className="ps-input" style={{minHeight:'60px'}} value={formData.faqIntro} onChange={e => handleChange('faqIntro', e.target.value)} />
            </div>

            <div className="ps-group">
              <label className="ps-label">FAQ Side Image</label>
              <div className="ps-image-upload-wrapper">
                {formData.faqImage && <img src={resolveUploadedImage(formData.faqImage)} alt="Preview" className="ps-image-preview" onError={(e) => e.target.style.display='none'} />}
                <div style={{flex:1}}>
                  <label className={`ps-upload-btn ${uploadingImage ? 'disabled' : ''}`}>
                    <RiImageAddFill /> Upload Image
                    <input type="file" hidden accept="image/*" onChange={e => handleImageUpload(e.target.files[0], val => handleChange('faqImage', val))} disabled={uploadingImage} />
                  </label>
                </div>
              </div>
            </div>

            <div className="ps-dynamic-list">
              {formData.faqs.map((faq, i) => (
                <div key={i} className="ps-dynamic-item">
                  <input className="ps-input" placeholder="Question" value={faq.q} onChange={e => handleArrayChange('faqs', i, 'q', e.target.value)} style={{marginBottom:'10px'}} />
                  <textarea className="ps-input" style={{minHeight:'60px', marginBottom:'10px'}} placeholder="Answer" value={faq.a} onChange={e => handleArrayChange('faqs', i, 'a', e.target.value)} />
                  <button type="button" className="ps-delete-btn" onClick={() => removeArrayItem('faqs', i)}><RiDeleteBinLine /> Remove FAQ</button>
                </div>
              ))}
            </div>
            {formData.faqs.length < 6 && (
              <button type="button" className="ps-add-btn" onClick={() => addArrayItem('faqs', {q:'', a:''})}><RiAddLine /> Add FAQ</button>
            )}
          </div>

          <div className="ps-card">
            <h2 className="ps-card-title">Instagram Strip (Max 50)</h2>
            <div className="ps-dynamic-list">
              {formData.instaImages.map((img, i) => (
                <div key={i} className="ps-dynamic-item ps-row">
                  {img && <img src={resolveUploadedImage(img)} alt="Insta" className="ps-image-preview" onError={(e) => e.target.style.display='none'} />}
                  <div style={{flex:1}}>
                    <label className={`ps-upload-btn ${uploadingImage ? 'disabled' : ''}`}>
                      <RiImageAddFill /> Replace Image
                      <input type="file" hidden accept="image/*" onChange={e => handleImageUpload(e.target.files[0], val => handleArrayStringChange('instaImages', i, val))} disabled={uploadingImage} />
                    </label>
                  </div>
                  <button type="button" className="ps-delete-btn" onClick={() => removeArrayItem('instaImages', i)}><RiDeleteBinLine /></button>
                </div>
              ))}
            </div>
            {formData.instaImages.length < 50 && (
              <button type="button" className="ps-add-btn" onClick={() => addArrayItem('instaImages', '')}><RiAddLine /> Add Instagram Image ({formData.instaImages.length}/50)</button>
            )}
          </div>

          <div className="ps-save-bar">
            <div>
              <h3 style={{margin:0, fontSize:'16px'}}>Unsaved Changes</h3>
              <p style={{margin:0, fontSize:'13px', color:'#64748b'}}>Remember to save your edits</p>
            </div>
            <button type="submit" className="ps-save-btn" disabled={saving}>
              {saving ? <><RiRefreshLine className="sp-spin" /> Saving…</> : <><RiSave2Fill /> Save Changes</>}
            </button>
          </div>

        </form>
      )}
    </div>
  );
};

export default AboutPageSettings;
