import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API } from '../config';
import { RiSave2Fill, RiRefreshLine } from 'react-icons/ri';
import './PageSettings.css';

const defaultContactData = {
  phone: '+91 96204 39696',
  whatsapp: '919620439696',
  email: 'nikitha9320@gmail.com',
  sms: '+914423456789',
  addressLine1: '11, 1st Main Rd, near CBD Hotel, ATR Layout',
  addressLine2: 'Bengaluru, Karnataka – 560017, India',
  businessHours: 'Mon – Sat: 9:00 AM – 6:00 PM',
  mapIframe: "https://maps.google.com/maps?q=Anyra%27s%20Trove%2C%2011%2C%201st%20Main%20Rd%2C%20near%20CBD%20Hotel%2C%20ATR%20Layout%2C%20Bengaluru%2C%20Karnataka%20560017&t=&z=16&ie=UTF8&iwloc=&output=embed"
};

const ContactPageSettings = () => {
  const [formData, setFormData] = useState(defaultContactData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/settings`);
      if (res.data && res.data.success && res.data.data.CONTACT_PAGE_DATA) {
        try {
          const parsed = JSON.parse(res.data.data.CONTACT_PAGE_DATA);
          setFormData(prev => ({ ...prev, ...parsed }));
        } catch (e) { console.error("Error parsing CONTACT_PAGE_DATA", e); }
      }
    } catch (err) {
      toast.error('Failed to load contact settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.put(`${API}/settings`, {
        CONTACT_PAGE_DATA: JSON.stringify(formData)
      });
      if (res.data && res.data.success) {
        toast.success('Contact page settings saved successfully!');
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

  return (
    <div className="ps-page">
      <div className="ps-header">
        <div>
          <h1 className="ps-title">Contact Page Editor</h1>
          <p className="ps-subtitle">Manage details shown on the public Contact Us page</p>
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
            <h2 className="ps-card-title">Contact Information</h2>
            <div className="ps-grid-2">
              <div className="ps-group">
                <label className="ps-label">Phone Number</label>
                <input className="ps-input" value={formData.phone} onChange={e => handleChange('phone', e.target.value)} />
              </div>
              <div className="ps-group">
                <label className="ps-label">WhatsApp Number (incl. country code, no +)</label>
                <input className="ps-input" value={formData.whatsapp} onChange={e => handleChange('whatsapp', e.target.value)} />
              </div>
              <div className="ps-group">
                <label className="ps-label">Email Address</label>
                <input className="ps-input" type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} />
              </div>
              <div className="ps-group">
                <label className="ps-label">SMS Number</label>
                <input className="ps-input" value={formData.sms} onChange={e => handleChange('sms', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="ps-card">
            <h2 className="ps-card-title">Store Address & Hours</h2>
            <div className="ps-group">
              <label className="ps-label">Address Line 1</label>
              <input className="ps-input" value={formData.addressLine1} onChange={e => handleChange('addressLine1', e.target.value)} />
            </div>
            <div className="ps-group">
              <label className="ps-label">Address Line 2</label>
              <input className="ps-input" value={formData.addressLine2} onChange={e => handleChange('addressLine2', e.target.value)} />
            </div>
            <div className="ps-group">
              <label className="ps-label">Business Hours Text</label>
              <input className="ps-input" value={formData.businessHours} onChange={e => handleChange('businessHours', e.target.value)} />
            </div>
            <div className="ps-group">
              <label className="ps-label">Google Maps Embed URL (src attribute only)</label>
              <textarea className="ps-input" style={{minHeight:'80px'}} value={formData.mapIframe} onChange={e => handleChange('mapIframe', e.target.value)} />
            </div>
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

export default ContactPageSettings;
