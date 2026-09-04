import React, { useState, useEffect } from 'react';
import { API } from '../config';
import { toast } from 'react-toastify';
import { RiTruckLine, RiMapPin2Line, RiMapLine, RiGlobalLine, RiInformationLine, RiLightbulbLine, RiCloseLine } from 'react-icons/ri';
import './ShippingZonesPage.css';
import AdminPagination, { ADMIN_PAGE_SIZE } from '../components/AdminPagination';

const ZONE_STATES = {
  LOCAL: ['Karnataka'],
  ZONAL: [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Delhi', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Jammu and Kashmir', 'Ladakh'
  ],
  REGIONAL: ['Tamil Nadu', 'Kerala', 'Andhra Pradesh', 'Telangana', 'Goa', 'Puducherry']
};

const ZONE_COLORS = { LOCAL: '#2d5a1b', ZONAL: '#c8a84b', REGIONAL: '#1a4b8c' };
const ZONE_LABELS = { LOCAL: 'Local (Karnataka)', ZONAL: 'Zonal (Rest of India)', REGIONAL: 'Regional (Nearby States)' };
const ZONE_ICONS = { LOCAL: RiMapPin2Line, ZONAL: RiMapLine, REGIONAL: RiGlobalLine };

export default function ShippingZonesPage() {
  const [activeTab, setActiveTab] = useState('LOCAL');
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ stateName: '', amount: '' });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/shipping/zones`);
      const d = await r.json();
      if (d.success) setZones(d.data || []);
    } catch (e) { toast.error('Failed to load zones'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchZones(); }, []);

  const tabZones = zones.filter(z => z.zoneType === activeTab);
  const totalPages = Math.max(1, Math.ceil(tabZones.length / ADMIN_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedZones = tabZones.slice((safePage - 1) * ADMIN_PAGE_SIZE, safePage * ADMIN_PAGE_SIZE);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.stateName || !form.amount) return toast.error('Select state and enter amount');
    setSaving(true);
    try {
      const r = await fetch(`${API}/shipping/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneType: activeTab, stateName: form.stateName, amount: Number(form.amount) })
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      toast.success('Shipping zone added!');
      setForm({ stateName: '', amount: '' });
      fetchZones();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (id) => {
    if (!editAmount) return;
    try {
      const r = await fetch(`${API}/shipping/zones/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(editAmount) })
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      toast.success('Updated!');
      setEditId(null);
      fetchZones();
    } catch (e) { toast.error(e.message); }
  };

  const deleteZone = async (id) => {
    try {
      const r = await fetch(`${API}/shipping/zones/${id}`, { method: 'DELETE' });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      toast.success('Deleted!');
      fetchZones();
    } catch (e) { toast.error(e.message); }
  };

  const handleDelete = (id) => {
    let confirmationToastId;
    confirmationToastId = toast.warn(
      <div style={{ lineHeight: 1.45 }}>
        <strong>Delete this shipping zone?</strong>
        <p style={{ margin: '4px 0 10px', fontSize: 12 }}>This cannot be undone.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => { toast.dismiss(confirmationToastId); deleteZone(id); }} style={{ border: 'none', borderRadius: 6, padding: '6px 12px', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
          <button type="button" onClick={() => toast.dismiss(confirmationToastId)} style={{ border: 'none', borderRadius: 6, padding: '6px 12px', background: '#e5e7eb', color: '#374151', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>,
      { autoClose: false, closeOnClick: false, closeButton: false, draggable: false }
    );
  };

  const addedStates = tabZones.map(z => z.stateName);
  const availableStates = ZONE_STATES[activeTab]?.filter(s => !addedStates.includes(s)) || [];

  return (
    <div className="szp-page">
      <div className="szp-header">
        <h1><RiTruckLine style={{ marginRight: 8, verticalAlign: 'middle' }} />Shipping Zone Rates</h1>
        <p>Set shipping charges by zone. Bangalore base → Karnataka (Local) → Nearby states (Zonal) → Rest of India (Regional)</p>
      </div>

      {/* Zone Tabs */}
      <div className="szp-tabs">
        {['LOCAL', 'ZONAL', 'REGIONAL'].map(z => {
          const Icon = ZONE_ICONS[z];
          return (
            <button
              key={z}
              className={`szp-tab ${activeTab === z ? 'active' : ''}`}
              style={{ '--zone-color': ZONE_COLORS[z] }}
              onClick={() => { setActiveTab(z); setCurrentPage(1); }}
            >
              <Icon style={{ marginRight: 5, verticalAlign: 'middle' }} />{ZONE_LABELS[z]}
            </button>
          );
        })}
      </div>

      {/* Add Form */}
      <div className="szp-card">
        <h3>Add {ZONE_LABELS[activeTab]} Rate</h3>
        <form className="szp-form" onSubmit={handleAdd}>
          <select
            value={form.stateName}
            onChange={e => setForm(p => ({ ...p, stateName: e.target.value }))}
          >
            <option value="">-- Select State --</option>
            {availableStates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Shipping Amount (₹)"
            value={form.amount}
            onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
          />
          <button type="submit" disabled={saving} className="szp-btn-add">
            {saving ? 'Saving...' : '+ Add Zone'}
          </button>
        </form>
      </div>

      {/* Zone List */}
      <div className="szp-card">
        <h3>Current {ZONE_LABELS[activeTab]} Rates</h3>
        {loading ? (
          <div className="szp-loading">Loading...</div>
        ) : tabZones.length === 0 ? (
          <div className="szp-empty">No zones configured for {activeTab}. Add one above.</div>
        ) : (
          <table className="szp-table">
            <thead>
              <tr><th>State</th><th>Zone</th><th>Shipping Amount</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {paginatedZones.map(z => (
                <tr key={z.id}>
                  <td><strong>{z.stateName}</strong></td>
                  <td><span className="szp-zone-badge" style={{ background: ZONE_COLORS[z.zoneType] + '20', color: ZONE_COLORS[z.zoneType], border: `1px solid ${ZONE_COLORS[z.zoneType]}40` }}>{z.zoneType}</span></td>
                  <td>
                    {editId === z.id ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input type="number" className="szp-edit-input" value={editAmount} onChange={e => setEditAmount(e.target.value)} />
                        <button className="szp-btn-save" onClick={() => handleUpdate(z.id)}>Save</button>
                        <button className="szp-btn-cancel" onClick={() => setEditId(null)}><RiCloseLine /></button>
                      </div>
                    ) : (
                      <strong style={{ color: '#2d5a1b', fontSize: '1.05rem' }}>₹{Number(z.amount).toFixed(2)}</strong>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="szp-btn-edit" onClick={() => { setEditId(z.id); setEditAmount(z.amount); }}>Edit</button>
                      <button className="szp-btn-delete" onClick={() => handleDelete(z.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <AdminPagination page={safePage} totalItems={tabZones.length} onPageChange={setCurrentPage} label="shipping zones" />
      </div>

      {/* Info Box */}
      <div className="szp-info">
        <h4><RiInformationLine style={{ marginRight: 6, verticalAlign: 'middle' }} />How Shipping Zones Work</h4>
        <ul>
          <li><RiMapPin2Line style={{ marginRight: 4, verticalAlign: 'middle' }} /><strong>Local (Karnataka):</strong> Customer is from Karnataka state</li>
          <li><RiMapLine style={{ marginRight: 4, verticalAlign: 'middle' }} /><strong>Zonal:</strong> Nearby states — Tamil Nadu, Kerala, AP, Telangana, Goa, Maharashtra</li>
          <li><RiGlobalLine style={{ marginRight: 4, verticalAlign: 'middle' }} /><strong>Regional:</strong> All other states across India</li>
          <li><RiLightbulbLine style={{ marginRight: 4, verticalAlign: 'middle' }} />Enter pincode in checkout → state auto-detected → matching rate shown</li>
        </ul>
      </div>
    </div>
  );
}
