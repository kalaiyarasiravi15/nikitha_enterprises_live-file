import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { RiMailSendLine, RiCloseLine } from 'react-icons/ri';
import './NewsletterPage.css';
import AdminPagination, { ADMIN_PAGE_SIZE } from '../components/AdminPagination';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const NewsletterPage = () => {
    const [subscribers, setSubscribers] = useState([]);
    const [customerEmails, setCustomerEmails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = ADMIN_PAGE_SIZE;
    const [statusFilter, setStatusFilter] = useState('all');
    
    // Notification Form State
    const [target, setTarget] = useState('all');
    const [specificEmail, setSpecificEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetchSubscribers();
        fetchCustomerEmails();
    }, []);

    const fetchSubscribers = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get(`${API_URL}/newsletter`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setSubscribers(res.data.data);
            }
        } catch (error) {
            toast.error('Failed to fetch subscribers');
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomerEmails = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get(`${API_URL}/customers/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const list = res.data?.data || res.data?.customers || res.data || [];
            if (Array.isArray(list)) {
                setCustomerEmails(list.map(c => c.email).filter(Boolean));
            }
        } catch (e) {}
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (target === 'specific' && !specificEmail) {
            return toast.error('Please enter the specific email');
        }
        if (!subject || !message) {
            return toast.error('Subject and Message are required');
        }

        setSending(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.post(`${API_URL}/newsletter/send`, {
                target, specificEmail, subject, message
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                toast.success('Notification sent successfully!');
                setModalOpen(false);
                setSubject('');
                setMessage('');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send notification');
        } finally {
            setSending(false);
        }
    };

    const handleStatusChange = async (subscriberId, currentStatus) => {
        const nextStatus = currentStatus === 'active' ? 'unsubscribed' : 'active';
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.patch(`${API_URL}/newsletter/${subscriberId}/status`, {
                status: nextStatus
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                toast.success(`Subscriber marked as ${nextStatus}`);
                fetchSubscribers();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update subscriber status');
        }
    };

    const activeSubscribers = subscribers.filter(sub => sub.status === 'active').length;
    const unsubscribedCount = subscribers.filter(sub => sub.status === 'unsubscribed').length;
    const filteredSubscribers = subscribers.filter(sub => {
        const matchesSearch = String(sub.email || '').toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' ? true : sub.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
    const totalPages = Math.max(1, Math.ceil(filteredSubscribers.length / itemsPerPage));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedSubscribers = filteredSubscribers.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

    return (
        <div className="newsletter-page">
            <div className="newsletter-hero">
                <div>
                    <p className="newsletter-kicker">Customer Growth</p>
                    <h1 className="page-title">Newsletter Subscribers</h1>
                    <p className="newsletter-subtitle">Track opt-ins, manage promotions, and send campaigns from one place.</p>
                </div>
                <button className="ars-btn-primary" onClick={() => setModalOpen(true)}>
                    <RiMailSendLine /> Send Notification
                </button>
            </div>

            <div className="newsletter-stats">
                <div className="newsletter-stat-card">
                    <span>Total Subscribers</span>
                    <strong>{subscribers.length}</strong>
                </div>
                <div className="newsletter-stat-card">
                    <span>Active</span>
                    <strong>{activeSubscribers}</strong>
                </div>
                <div className="newsletter-stat-card">
                    <span>Unsubscribed</span>
                    <strong>{unsubscribedCount}</strong>
                </div>
            </div>

            <div className="newsletter-toolbar">
                <div className="newsletter-toolbar-left">
                    <input
                        type="text"
                        placeholder="Search by email..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                        className="newsletter-search"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                        className="newsletter-filter"
                    >
                        <option value="all">All Subscribers</option>
                        <option value="active">Active</option>
                        <option value="unsubscribed">Unsubscribed</option>
                    </select>
                </div>
                <div className="newsletter-hint">Showing {filteredSubscribers.length} of {subscribers.length} records</div>
            </div>

            <div className="subscribers-table-wrapper">
                {loading ? (
                    <div className="loading-state">Loading subscribers...</div>
                ) : filteredSubscribers.length === 0 ? (
                    <div className="empty-state">No subscribers found.</div>
                ) : (
                    <table className="ars-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Subscribed At</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedSubscribers.map((sub, index) => (
                                <tr key={sub.id} className={sub.status === 'unsubscribed' ? 'row-unsubscribed' : ''}>
                                    <td>{(safePage - 1) * itemsPerPage + index + 1}</td>
                                    <td>{sub.email}</td>
                                    <td>
                                        <span className={`status-badge ${sub.status}`}>
                                            {sub.status}
                                        </span>
                                    </td>
                                    <td>{new Date(sub.createdAt).toLocaleString()}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className={`status-action-btn ${sub.status === 'active' ? 'danger' : 'success'}`}
                                            onClick={() => handleStatusChange(sub.id, sub.status)}
                                        >
                                            {sub.status === 'active' ? 'Mark Unsubscribed' : 'Reactivate'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <AdminPagination page={safePage} totalItems={filteredSubscribers.length} onPageChange={setCurrentPage} label="subscribers" />

            {/* Send Notification Modal */}
            {modalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Send Promotional Notification</h2>
                            <RiCloseLine className="close-icon" onClick={() => setModalOpen(false)} />
                        </div>
                        <form onSubmit={handleSend} className="modal-form">
                            <div className="modal-scroll">
                                <div className="form-group">
                                    <label>Target Audience</label>
                                    <select value={target} onChange={(e) => setTarget(e.target.value)}>
                                        <option value="all">All Active Subscribers</option>
                                        <option value="specific">Specific Subscriber</option>
                                    </select>
                                </div>

                                {target === 'specific' && (() => {
                                    const availableEmails = Array.from(new Set([
                                        ...subscribers.map(s => s.email).filter(Boolean),
                                        ...customerEmails
                                    ])).sort();

                                    return (
                                        <div className="form-group">
                                            <label>Recipient Email</label>
                                            <select
                                                value={specificEmail}
                                                onChange={(e) => setSpecificEmail(e.target.value)}
                                                required
                                            >
                                                <option value="">-- Select Subscriber Email --</option>
                                                {availableEmails.map((email) => (
                                                    <option key={email} value={email}>
                                                        {email}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                })()}

                                <div className="form-group">
                                    <label>Email Subject</label>
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="e.g., Deal of the Day: 50% OFF!"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Message / Offer Details</label>
                                    <textarea
                                        rows="8"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Type your promotional message here..."
                                    ></textarea>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="ars-btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                                <button type="submit" className="ars-btn-primary" disabled={sending}>
                                    {sending ? 'Sending...' : 'Send Notification'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NewsletterPage;
