import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RiSearchLine, RiDeleteBin6Line, RiCloseLine } from 'react-icons/ri';
import './InboxPage.css';

import { API } from '../config';
import AdminPagination, { ADMIN_PAGE_SIZE } from '../components/AdminPagination';


let _toastTimer = null;
const showToast = (message, type = 'success') => {
  let el = document.getElementById('__ars_toast__');
  if (!el) {
    el = document.createElement('div');
    el.id = '__ars_toast__';
    Object.assign(el.style, {
      position: 'fixed', bottom: '28px', right: '28px', zIndex: 99999,
      padding: '12px 20px', borderRadius: '10px', fontSize: '14px',
      fontWeight: '600', boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
      display: 'flex', alignItems: 'center', gap: '8px',
      transition: 'opacity 0.3s', opacity: '0', pointerEvents: 'none',
      fontFamily: 'inherit',
    });
    document.body.appendChild(el);
  }
  const colors = {
    success: { bg: '#e8f5e9', color: '#1a7a3f', icon: '' },
    error:   { bg: '#fdecea', color: '#c62828', icon: '' },
  };
  const c = colors[type] || colors.success;
  el.style.background = c.bg;
  el.style.color = c.color;
  el.innerHTML = `<span>${c.icon}</span><span>${message}</span>`;
  el.style.opacity = '1';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 3000);
};

// ── Inline confirm card (replaces window.confirm) ───────────────────────────
const ConfirmCard = ({ onConfirm, onCancel }) => (
  <div style={{
    position: 'fixed', bottom: 28, right: 28, zIndex: 99998,
    background: '#fff', borderRadius: 12, padding: '16px 20px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
    display: 'flex', flexDirection: 'column', gap: 12, minWidth: 220,
  }}>
    <span style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>
      Delete this message?
    </span>
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={onConfirm} style={{
        flex: 1, background: '#d32f2f', color: '#fff', border: 'none',
        borderRadius: 7, padding: '7px 0', cursor: 'pointer', fontWeight: 700, fontSize: 13,
      }}>Delete</button>
      <button onClick={onCancel} style={{
        flex: 1, background: '#f0f0f0', color: '#333', border: 'none',
        borderRadius: 7, padding: '7px 0', cursor: 'pointer', fontWeight: 600, fontSize: 13,
      }}>Cancel</button>
    </div>
  </div>
);

const InboxPage = () => {
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = ADMIN_PAGE_SIZE;
  const [loading, setLoading]   = useState(true);
  const [confirm, setConfirm]   = useState(null); // holds { id } when open

  useEffect(() => { fetchMessages(); }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/contact/all`);
      const data = r.data;
      if (Array.isArray(data)) {
        setMessages(data);
      } else if (data && Array.isArray(data.data)) {
        setMessages(data.data);
      } else if (data && Array.isArray(data.messages)) {
        setMessages(data.messages);
      } else {
        setMessages([]);
      }
    } catch (e) {
      showToast('Failed to load messages', 'error');
    }
    setLoading(false);
  };

  const openMessage = async (msg) => {
    setSelected(msg);
    showToast(`Viewing message from ${msg.name}`, 'success');
    if (!msg.isRead) {
      try {
        await axios.put(`${API}/contact/read/${msg.id}`);
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
        // Update navbar & sidebar counts instantly
        window.dispatchEvent(new Event('unread-messages-updated'));
      } catch (e) {}
    }
  };

  const askDelete  = (id) => setConfirm({ id });
  const cancelDelete = () => setConfirm(null);

  const confirmDelete = async () => {
    const id = confirm.id;
    setConfirm(null);
    try {
      await axios.delete(`${API}/contact/delete/${id}`);
      if (selected?.id === id) setSelected(null);
      fetchMessages();
      showToast('Message deleted', 'success');
    } catch (e) {
      showToast('Failed to delete message', 'error');
    }
  };

  const filtered = messages.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase()) ||
    m.subject?.toLowerCase().includes(search.toLowerCase())
  );

  const unreadCount = messages.filter(m => !m.isRead).length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedMessages = filtered.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  return (
    <div className="inbox-wrapper">

      {/* ── Confirm card ── */}
      {confirm && (
        <ConfirmCard onConfirm={confirmDelete} onCancel={cancelDelete} />
      )}

      {/* ── Top Bar ── */}
      <div className="inbox-topbar">
        <div className="inbox-title-area">
          <h2>Inbox <span>Messages</span></h2>
          <span className="inbox-count-pill">{messages.length} total</span>
          {unreadCount > 0 && (
            <span className="inbox-unread-pill">{unreadCount} unread</span>
          )}
        </div>
        <div className="inbox-search">
          <RiSearchLine />
          <input
            placeholder="Search messages..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>
      </div>

      {/* ── Layout ── */}
      <div className={`inbox-layout ${selected ? 'split' : 'single'}`}>

        {/* ── Message List ── */}
        <div className="inbox-list-card">
          <div className="inbox-list-header">
            <span>All Messages</span>
          </div>

          {loading ? (
            <div className="inbox-empty">
              <div className="inbox-empty-icon">⏳</div>
              <div>Loading messages...</div>
            </div>
          ) : paginatedMessages.length === 0 ? (
            <div className="inbox-empty">
              <div className="inbox-empty-icon">📭</div>
              <div>No messages yet.</div>
            </div>
          ) : (
            paginatedMessages.map(msg => (
              <div
                key={msg.id}
                className={`inbox-msg-row ${!msg.isRead ? 'unread' : ''} ${selected?.id === msg.id ? 'active' : ''}`}
                onClick={() => openMessage(msg)}
              >
                {!msg.isRead && <span className="inbox-unread-dot" />}

                <div className="inbox-row-top">
                  <span className={`inbox-sender-name ${!msg.isRead ? 'bold' : ''}`}>
                    {msg.name}
                  </span>
                  <span className="inbox-date">
                    {new Date(msg.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>

                <div className="inbox-email">{msg.email}</div>

                <div className={`inbox-preview ${!msg.isRead ? 'unread-text' : ''}`}>
                  {msg.subject && (
                    <span className="inbox-subject-tag">{msg.subject}</span>
                  )}
                  {msg.message?.slice(0, 55)}...
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Message Detail ── */}
        {selected && (
          <div className="inbox-detail-card">

            <div className="inbox-detail-header">
              <span className="inbox-detail-label">Message Detail</span>
              <div className="inbox-detail-actions">
                <button
                  className="inbox-act-btn del"
                  onClick={() => askDelete(selected.id)}
                  title="Delete"
                >
                  <RiDeleteBin6Line />
                </button>
                <button
                  className="inbox-act-btn"
                  onClick={() => setSelected(null)}
                  title="Close"
                >
                  <RiCloseLine />
                </button>
              </div>
            </div>

            <div className="inbox-detail-body">

              {/* Meta Grid */}
              <div className="inbox-meta-grid">
                <div className="inbox-meta-item">
                  <div className="inbox-meta-label">From</div>
                  <div className="inbox-meta-value">{selected.name}</div>
                </div>
                <div className="inbox-meta-item">
                  <div className="inbox-meta-label">Email</div>
                  <div className="inbox-meta-value sm">{selected.email}</div>
                </div>
                {selected.phone && (
                  <div className="inbox-meta-item">
                    <div className="inbox-meta-label">Phone</div>
                    <div className="inbox-meta-value">{selected.phone}</div>
                  </div>
                )}
                <div className="inbox-meta-item">
                  <div className="inbox-meta-label">Date</div>
                  <div className="inbox-meta-value sm">
                    {new Date(selected.createdAt).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Subject */}
              {selected.subject && (
                <div className="inbox-subject-block">
                  <div className="inbox-meta-label">Subject</div>
                  <span className="inbox-subject-value">{selected.subject}</span>
                </div>
              )}

              {/* Message */}
              <div>
                <div className="inbox-msg-label">Message</div>
                <div className="inbox-msg-body">{selected.message}</div>
              </div>

            </div>
          </div>
        )}
        </div>
      <AdminPagination page={safePage} totalItems={filtered.length} onPageChange={setCurrentPage} label="messages" />
      </div>
    );
};
export default InboxPage;
