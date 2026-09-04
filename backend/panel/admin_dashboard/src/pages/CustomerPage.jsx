import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
    RiEyeLine, RiSearchLine, RiCloseLine,
    RiUserLine, RiMapPinLine, RiProfileLine,
    RiArrowLeftSLine, RiArrowRightSLine,
    RiArrowDownSLine, RiArrowUpSLine,
    RiShoppingBag3Line,
} from "react-icons/ri";
import './CustomerPage.css';
import { API, IMG } from '../config';
import AdminPagination from '../components/AdminPagination';


const CustomerPage = () => {
    const [customers,   setCustomers]   = useState([]);
    const [guestCustomers, setGuestCustomers] = useState([]);
    const [businessCustomers, setBusinessCustomers] = useState([]);
    const [searchTerm,  setSearchTerm]  = useState('');
    const [selectedCust, setSelectedCust] = useState(null);
    const [expandedRow, setExpandedRow] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [customerView, setCustomerView] = useState('registered');
    const [customerOrders, setCustomerOrders] = useState([]);
    const [custStats, setCustStats] = useState(null);
    const [ordersLoading, setOrdersLoading] = useState(false);

    const customersPerPage = 10;

    const location = useLocation();

    useEffect(() => { fetchCustomers(); }, []);

    // Filter logic
    const query = new URLSearchParams(location.search);
    const filterQuery = query.get('filter');

    const fetchCustomers = async () => {
        try {
            const [registeredRes, guestsRes, businessRes] = await Promise.all([
                axios.get(`${API}/customers/all`),
                axios.get(`${API}/customers/guests`),
                axios.get(`${API}/customers/business`)
            ]);
            setCustomers(registeredRes.data);
            setGuestCustomers(Array.isArray(guestsRes.data) ? guestsRes.data : []);
            setBusinessCustomers(Array.isArray(businessRes.data) ? businessRes.data : []);
        } catch (err) {
            toast.error('Failed to load customers');
            console.error(err);
        }
    };

    const handleDeleteRequest = (id) => {
        toast.warn(
            <div style={{ lineHeight: 1.5 }}>
                <strong>Delete this customer?</strong>
                <p style={{ margin: '4px 0 8px 0', fontSize: 12 }}>This will soft-delete their account but preserve past order data.</p>
                <div style={{ display: 'flex', gap: 8 }}>
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
                        onClick={() => toast.dismiss()}
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
        try {
            await axios.delete(`${API}/customers/delete/${id}`);
            toast.success('Customer deleted successfully');
            fetchCustomers();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete customer');
            console.error(err);
        }
    };

    const toggleExpand = (custId) =>
        setExpandedRow(prev => prev === custId ? null : custId);

    const openCustomerDetails = async (customer) => {
        setSelectedCust(customer);
        setCustomerOrders([]);
        setCustStats(null);
        setOrdersLoading(true);
        try {
            if (customer.customerType === 'BUSINESS') {
                const ordersRes = await axios.get(`${API}/orders/all`, { params: { invoiceType: 'BUSINESS_GST', page: 1, limit: 1000 } });
                const businessOrders = (ordersRes.data?.orders || []).filter(order => order.businessGstin === customer.gstin);
                setCustomerOrders(businessOrders);
                setCustStats({
                    totalOrders: businessOrders.length,
                    successfulOrders: businessOrders.filter(order => order.orderStatus === 'Delivered').length,
                    canceledOrders: businessOrders.filter(order => order.orderStatus === 'Cancelled').length,
                    totalSpend: businessOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0)
                });
                return;
            }
            const [ordersRes, statsRes] = await Promise.all([
                axios.get(`${API}/orders/all`, { params: { customerId: customer.id, page: 1, limit: 1000 } }),
                axios.get(`${API}/customers/${customer.id}/stats`)
            ]);
            setCustomerOrders(ordersRes.data?.orders || []);
            setCustStats(statsRes.data?.stats || null);
        } catch (err) {
            toast.error('Failed to load this customer’s details');
        } finally {
            setOrdersLoading(false);
        }
    };

    const sourceCustomers = customerView === 'guest'
        ? guestCustomers
        : customerView === 'business'
            ? businessCustomers
            : customers;
    
    const filtered = sourceCustomers.filter(c => {
        let matchesSearch = true;
        let matchesActive = true;
        let matchesView = true;

        if (searchTerm) {
            matchesSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (c.id?.toString() || '').includes(searchTerm) ||
                            (c.email || '').toLowerCase().includes(searchTerm.toLowerCase());
        }
        
        if (filterQuery === 'Active') {
            matchesActive = !c.deletedAt && c.status !== 'Inactive';
        }

        const orders = Number(c.orderCount || 0);
        if (customerView === 'purchased') matchesView = !c.deletedAt && orders > 0;
        else if (customerView === 'deleted') matchesView = Boolean(c.deletedAt);
        else if (customerView === 'guest') matchesView = true;
        else if (customerView === 'business') matchesView = true;
        else matchesView = !c.deletedAt;

        return matchesSearch && matchesActive && matchesView;
    });
    const registeredCount = customers.filter(c => !c.deletedAt).length;
    const purchasedCount = customers.filter(c => !c.deletedAt && Number(c.orderCount || 0) > 0).length;
    const deletedCount = customers.filter(c => c.deletedAt).length;
    const guestCount = guestCustomers.length;
    const businessCount = businessCustomers.length;

    const totalPages   = Math.ceil(filtered.length / customersPerPage) || 1;
    const safePage     = currentPage > totalPages ? 1 : currentPage;
    const currentItems = filtered.slice((safePage - 1) * customersPerPage, safePage * customersPerPage);

    return (
        <div className="ars-customer-wrapper">

            <div className="ars-main-card">

                {/* HEADER */}
                <div className="card-header">
                    <div className="title-area">
                        <h1>Customer <span className="gold-text">Database</span></h1>
                        <p>Total Members: {filtered.length}</p>
                    </div>
                    <div className="search-bar-curved">
                        <RiSearchLine />
                        <input
                            type="text"
                            placeholder="Search by Name, Email or ID..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                </div>

                <div className="customer-filter-tabs" role="tablist" aria-label="Customer views">
                    <button className={customerView === 'registered' ? 'is-active' : ''} onClick={() => { setCustomerView('registered'); setCurrentPage(1); }}>
                        Registered customers <span>{registeredCount}</span>
                    </button>
                    <button className={customerView === 'purchased' ? 'is-active' : ''} onClick={() => { setCustomerView('purchased'); setCurrentPage(1); }}>
                        <RiShoppingBag3Line /> Customers with orders <span>{purchasedCount}</span>
                    </button>
                    <button className={customerView === 'guest' ? 'is-active' : ''} onClick={() => { setCustomerView('guest'); setCurrentPage(1); }}>
                        <RiShoppingBag3Line /> Guest customers <span>{guestCount}</span>
                    </button>
                    <button className={customerView === 'business' ? 'is-active' : ''} onClick={() => { setCustomerView('business'); setCurrentPage(1); }}>
                        <RiProfileLine /> GST business buyers <span>{businessCount}</span>
                    </button>
                    <button className={customerView === 'deleted' ? 'is-active is-deleted' : ''} onClick={() => { setCustomerView('deleted'); setCurrentPage(1); }}>
                        Deleted accounts <span>{deletedCount}</span>
                    </button>
                </div>

                {/* TABLE */}
                <div className="table-responsive">
                    <table className="ars-premium-table">
                        <thead>
                            <tr>
                                <th># ID</th>
                                <th>Customer Name</th>
                                <th>Contact</th>
                                <th>Shipping Addresses</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.length > 0 ? currentItems.map((cust) => (
                                <React.Fragment key={cust.id}>
                                    {/* Main row */}
                                    <tr className={expandedRow === cust.id ? 'row-expanded' : ''}>
                                        <td><span className="id-txt"># {cust.id}</span></td>
                                        <td>
                                            <span className="name-txt">{cust.name}</span>
                                            {cust.customerType === 'GUEST' && (
                                                <span style={{ marginLeft: '8px', padding: '2px 8px', background: '#e0f2fe', color: '#0369a1', borderRadius: '12px', fontSize: '11px', fontWeight: 600, display: 'inline-block' }}>
                                                    Guest buyer
                                                </span>
                                            )}
                                            {cust.customerType === 'BUSINESS' && (
                                                <span style={{ marginLeft: '8px', padding: '2px 8px', background: '#ecfdf5', color: '#047857', borderRadius: '12px', fontSize: '11px', fontWeight: 700, display: 'inline-block' }}>
                                                    GST business
                                                </span>
                                            )}
                                            {cust.deletedAt && (
                                                <span style={{ 
                                                    marginLeft: '8px', padding: '2px 8px', 
                                                    background: '#fee2e2', color: '#ef4444', 
                                                    borderRadius: '12px', fontSize: '11px', 
                                                    fontWeight: 600, display: 'inline-block' 
                                                }}>
                                                    Deleted person
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="email-sub">{cust.email}</div>
                                            <div className="phone-sub">{cust.phone}</div>
                                        </td>
                                        <td>
                                            {cust.customerType === 'BUSINESS' ? (
                                                <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                                                    <strong>{cust.gstin}</strong>
                                                    <div className="no-val">{[cust.billingState, cust.billingPincode].filter(Boolean).join(' · ')}</div>
                                                </div>
                                            ) : cust.ShippingAddresses?.length > 0 ? (
                                                <button
                                                    className={`ship-expand-btn ${expandedRow === cust.id ? 'active' : ''}`}
                                                    onClick={() => toggleExpand(cust.id)}
                                                >
                                                    <RiMapPinLine />
                                                    {cust.ShippingAddresses.length} address{cust.ShippingAddresses.length > 1 ? 'es' : ''}
                                                    {expandedRow === cust.id
                                                        ? <RiArrowUpSLine />
                                                        : <RiArrowDownSLine />}
                                                </button>
                                            ) : <span className="no-val">None</span>}
                                        </td>
                                        <td className="action-cell">
                                            {cust.customerType === 'GUEST'
                                                ? <span className="no-val">Guest order data</span>
                                                : <button className="eye-btn" onClick={() => openCustomerDetails(cust)} title="View customer and order history"><RiEyeLine /></button>}
                                        </td>
                                    </tr>

                                    {/* Expanded shipping sub-panel — view only */}
                                    {expandedRow === cust.id && (
                                        <tr className="expanded-sub-row">
                                            <td colSpan={5} style={{ padding: 0 }}>
                                                <div className="shipping-expand-panel">
                                                    <div className="sep-header">
                                                        <RiMapPinLine className="sep-icon" />
                                                        Saved Shipping Addresses for <strong>&nbsp;{cust.name}</strong>
                                                        <span className="sep-count">
                                                            {cust.ShippingAddresses.length} saved
                                                        </span>
                                                    </div>
                                                    <div className="sa-list">
                                                        {cust.ShippingAddresses.map((addr, i) => (
                                                            <div className="sa-row" key={addr.id}>
                                                                <div className="sa-row-left">
                                                                    <span className="sa-num">#{i + 1}</span>
                                                                    <div className="sa-details">
                                                                        <span className="sa-name">{addr.name}</span>
                                                                        <span className="sa-phone">{addr.phone}</span>
                                                                        <span className="sa-addr">
                                                                            {[addr.addressLine, addr.city, addr.district, addr.state]
                                                                                .filter(Boolean).join(', ')}
                                                                            {addr.pincode ? ` - ${addr.pincode}` : ''}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="empty-row">No customers found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION */}
                <AdminPagination
                    page={safePage}
                    totalItems={filtered.length}
                    pageSize={customersPerPage}
                    onPageChange={setCurrentPage}
                    label="customers"
                />
                <div className="pagination-footer" style={{ display: 'none' }}>
                    <span>Page {safePage} of {totalPages} · {filtered.length} customers</span>
                    <div className="p-btns">
                        <button disabled={safePage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                            <RiArrowLeftSLine />
                        </button>
                        <button disabled={safePage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                            <RiArrowRightSLine />
                        </button>
                    </div>
                </div>
            </div>

            {/* FULL DETAIL MODAL — view only */}
            {selectedCust && (
                <div className="ars-overlay" onClick={() => setSelectedCust(null)}>
                    <div className="detail-modal-card" onClick={(e) => e.stopPropagation()}>

                        <div className="modal-header-black">
                            <div className="cust-identity">
                                <RiProfileLine className="gold-text" size={20} />
                                <h3>
                                    {selectedCust.name}
                                    <span className="id-badge">ID: {selectedCust.id}</span>
                                </h3>
                            </div>
                            <button className="close-btn" onClick={() => setSelectedCust(null)}>
                                <RiCloseLine size={18} />
                            </button>
                        </div>

                        <div className="modal-body-grid">
                            <div className="address-section register-box">
                                <h4 className="sub-heading">
                                    <RiUserLine /> Registered Info
                                </h4>
                                <div className="addr-details">
                                    <p><strong>Name</strong> {selectedCust.name}</p>
                                    <p><strong>Email</strong> {selectedCust.email}</p>
                                    <p><strong>Phone</strong> {selectedCust.phone}</p>
                                    {selectedCust.customerType === 'BUSINESS' && (
                                        <>
                                            <p><strong>GSTIN</strong> {selectedCust.gstin}</p>
                                            <p><strong>Billing Address</strong> {selectedCust.billingAddress}</p>
                                            <p><strong>Billing State</strong> {selectedCust.billingState}</p>
                                            <p><strong>Billing Pincode</strong> {selectedCust.billingPincode}</p>
                                        </>
                                    )}
                                </div>
                                {selectedCust.CustomerAddresses?.length > 0 && (
                                    <>
                                        <div style={{ borderTop: '1px solid #dce6f7', margin: '12px 0' }} />
                                        {selectedCust.CustomerAddresses.map(addr => (
                                            <div className="addr-details" key={addr.id}>
                                                {addr.houseNo && <p><strong>House No</strong> {addr.houseNo}</p>}
                                                {addr.street  && <p><strong>Street</strong>   {addr.street}</p>}
                                                {addr.city    && <p><strong>City</strong>     {addr.city}</p>}
                                                {addr.state   && <p><strong>State</strong>    {addr.state}</p>}
                                                {addr.pincode && <p><strong>Pincode</strong>  {addr.pincode}</p>}
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>

                            <div className="address-section stats-box" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                                <h4 className="sub-heading" style={{ color: '#d4af37', marginBottom: '12px' }}>
                                    📈 Order Analytics
                                </h4>
                                {custStats ? (
                                    <div className="addr-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                                        <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                            <p style={{ margin: 0, fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Total Orders</p>
                                            <h3 style={{ margin: '4px 0 0 0', fontSize: '20px', color: '#1e293b' }}>{custStats.totalOrders}</h3>
                                        </div>
                                        <div style={{ background: '#ecfdf5', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1fae5', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                            <p style={{ margin: 0, fontSize: '11px', color: '#047857', fontWeight: 600 }}>Delivered</p>
                                            <h3 style={{ margin: '4px 0 0 0', fontSize: '20px', color: '#065f46' }}>{custStats.successfulOrders}</h3>
                                        </div>
                                        <div style={{ background: '#fef2f2', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fee2e2', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                            <p style={{ margin: 0, fontSize: '11px', color: '#b91c1c', fontWeight: 600 }}>Cancelled</p>
                                            <h3 style={{ margin: '4px 0 0 0', fontSize: '20px', color: '#991b1b' }}>{custStats.canceledOrders}</h3>
                                        </div>
                                        <div style={{ background: '#fffbeb', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fef3c7', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                            <p style={{ margin: 0, fontSize: '11px', color: '#b45309', fontWeight: 600 }}>Total Spend</p>
                                            <h3 style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: 'bold', color: '#78350f' }}>₹{custStats.totalSpend.toLocaleString('en-IN')}</h3>
                                        </div>
                                    </div>
                                ) : <p className="no-data">Loading analytics stats...</p>}
                            </div>

                            <div className="address-section shipping-box">
                                <h4 className="sub-heading">
                                    <RiMapPinLine /> Shipping Addresses
                                    <span className="ship-count-inline">
                                        ({selectedCust.ShippingAddresses?.length || 0})
                                    </span>
                                </h4>
                                {selectedCust.ShippingAddresses?.length > 0 ? (
                                    <div className="shipping-list">
                                        {selectedCust.ShippingAddresses.map((addr, i) => (
                                            <div className="shipping-card" key={addr.id}>
                                                <div className="shipping-card-num">Address #{i + 1}</div>
                                                <div className="addr-details">
                                                    {addr.name        && <p><strong>Name</strong>    {addr.name}</p>}
                                                    {addr.phone       && <p><strong>Phone</strong>   {addr.phone}</p>}
                                                    {addr.addressLine && <p><strong>Address</strong> {addr.addressLine}</p>}
                                                    {addr.city        && <p><strong>City</strong>    {addr.city}</p>}
                                                    {addr.district    && <p><strong>District</strong>{addr.district}</p>}
                                                    {addr.state       && <p><strong>State</strong>   {addr.state}</p>}
                                                    {addr.pincode     && <p><strong>Pincode</strong> {addr.pincode}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="no-data">No shipping addresses used yet.</p>}
                            </div>
                        </div>

                        <section className="customer-order-history">
                            <div className="customer-order-history__head">
                                <h4><RiShoppingBag3Line /> Complete Order History</h4>
                                <span>{ordersLoading ? 'Loading…' : `${customerOrders.length} orders`}</span>
                            </div>
                            {ordersLoading ? <p className="no-data">Loading complete order history…</p>
                              : customerOrders.length === 0 ? <p className="no-data">No orders have been placed by this customer.</p>
                              : <div className="customer-order-history__list">
                                {customerOrders.map(order => (
                                  <article className="customer-history-order" key={order.orderId}>
                                    <div className="customer-history-order__meta">
                                      <strong>#{order.orderId}</strong>
                                      <span>{new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
                                      {order.isPreorder && <em>Pre-booking</em>}
                                      <b>{order.orderStatus}</b>
                                      <strong>₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}</strong>
                                    </div>
                                    <div className="customer-history-items">
                                      {(order.slots || []).map(item => {
                                        const image = item.Product?.mainImage || item.productImage;
                                        const imageSrc = image ? (image.startsWith('http') ? image : `${IMG}/${image}`) : null;
                                        return <div className="customer-history-item" key={item.id}>
                                          {imageSrc ? <img src={imageSrc} alt={item.Product?.name || item.productName || 'Product'} /> : <div className="customer-history-item__empty" />}
                                          <div><strong>{item.Product?.name || item.productName || 'Product'}</strong><span>{item.variantLabel || item.selectedSubOption || 'Standard'} · Qty {item.quantity}</span></div>
                                          <b>₹{Number(item.salesPrice || 0).toLocaleString('en-IN')}</b>
                                        </div>;
                                      })}
                                    </div>
                                  </article>
                                ))}
                              </div>}
                        </section>

                        <div className="modal-footer-info">
                            <span>{selectedCust.email}</span>
                            <span>{selectedCust.phone}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerPage;
