import React, { useState, useEffect } from 'react';
import { API } from '../config';
import { toast } from 'react-toastify';
import {
  RiMoneyDollarCircleLine, RiBox3Line, RiCheckLine,
  RiTimeLine, RiTruckLine, RiLock2Line, RiBankCardLine,
  RiArrowLeftSLine, RiArrowRightSLine
} from 'react-icons/ri';
import './CodTrackerPage.css';

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CodTrackerPage() {
  const [activeTab, setActiveTab] = useState('cod');
  const [summary, setSummary] = useState(null);
  const [codOrders, setCodOrders] = useState([]);
  const [onlineOrders, setOnlineOrders] = useState([]);
  const [totalShippingDue, setTotalShippingDue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [courierFilter, setCourierFilter] = useState('All');
  const [costInputs, setCostInputs] = useState({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Settlement Modal State
  const [settlementModal, setSettlementModal] = useState({ open: false, order: null });
  const [settlementMode, setSettlementMode] = useState('PARTIAL'); // 'PARTIAL' or 'FULL'
  const [receivedInput, setReceivedInput] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumR, codR, onlineR] = await Promise.all([
        fetch(`${API}/tracker/cod-summary`).then(r => r.json()),
        fetch(`${API}/tracker/cod-orders`).then(r => r.json()),
        fetch(`${API}/tracker/online-orders`).then(r => r.json()),
      ]);
      if (sumR.success) setSummary(sumR.summary);
      if (codR.success) setCodOrders(codR.data || []);
      if (onlineR.success) {
        setOnlineOrders(onlineR.data || []);
        setTotalShippingDue(onlineR.totalShippingDue || 0);
      }
    } catch (e) { toast.error('Failed to load tracker data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [activeTab]);

  const handleOpenSettlement = (order) => {
    setSettlementModal({ open: true, order });
    setSettlementMode(order.codAmountStatus === 'paid' ? 'FULL' : 'PARTIAL');
    setReceivedInput(order.codReceivedAmount || '');
  };

  const handleSaveCourierCost = async (order, value) => {
    if (!value) return;
    try {
      const res = await fetch(`${API}/orders/shipping/update-settlement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
        body: JSON.stringify({ 
          orderIds: [order.orderId], 
          courierShippingCost: value,
          courierPaymentStatus: order.courierPaymentStatus || 'Unpaid'
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Courier cost saved!');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (err) {
      toast.error('Error saving cost');
    }
  };

  const handleSaveSettlement = async () => {
    if (!settlementModal.order) return;
    const order = settlementModal.order;
    let status = 'pending';
    let amount = 0;

    if (settlementMode === 'FULL') {
      status = 'paid';
      amount = Number(order.totalAmount || 0);
    } else {
      amount = Number(receivedInput || 0);
      if (amount <= 0) return toast.error('Enter a valid received amount');
      if (amount >= Number(order.totalAmount || 0)) {
        status = 'paid';
        amount = Number(order.totalAmount || 0);
      } else {
        status = 'partial';
      }
    }

    setUpdating(order.orderId);
    try {
      const r = await fetch(`${API}/tracker/cod-status/${order.orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codAmountStatus: status, codReceivedAmount: amount })
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      toast.success('Settlement status updated successfully!');
      setSettlementModal({ open: false, order: null });
      fetchData();
    } catch (e) { toast.error(e.message); }
    finally { setUpdating(null); }
  };

  const baseList = activeTab === 'cod' ? codOrders : onlineOrders;
  const currentList = baseList.filter(o => {
    if (courierFilter === 'All') return true;
    if (courierFilter === 'Manual') return o.courierPartner === 'Manual';
    if (courierFilter === 'Unassigned') return !o.courierPartner;
    return o.courierPartner === courierFilter;
  });
  const totalPages = Math.ceil(currentList.length / itemsPerPage) || 1;
  const paginatedList = currentList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="ctp-page">
      <div className="ctp-header">
        <h1><RiTruckLine style={{ marginRight: 8, verticalAlign: 'middle' }} />Shipping & Courier Settlement Tracker</h1>
        <p>Track Cash On Delivery collections, partial remittances, and courier shipping settlements</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="ctp-summary-grid">
          <div className="ctp-stat-card total">
            <div className="ctp-stat-icon"><RiBox3Line /></div>
            <div className="ctp-stat-value">{money(summary.totalCodAmount)}</div>
            <div className="ctp-stat-label">Total COD Orders</div>
            <div className="ctp-stat-sub">{summary.totalOrders} orders</div>
          </div>
          <div className="ctp-stat-card paid">
            <div className="ctp-stat-icon"><RiCheckLine /></div>
            <div className="ctp-stat-value">{money(Number(summary.totalPaid) + Number(summary.totalPartialReceived))}</div>
            <div className="ctp-stat-label">Received from Courier</div>
            <div className="ctp-stat-sub">{summary.paidOrders} fully paid</div>
          </div>
          <div className="ctp-stat-card pending">
            <div className="ctp-stat-icon"><RiTimeLine /></div>
            <div className="ctp-stat-value">{money(summary.totalPending)}</div>
            <div className="ctp-stat-label">Remaining Balance Due</div>
            <div className="ctp-stat-sub">{summary.pendingOrders} pending</div>
          </div>
          <div className="ctp-stat-card shipping">
            <div className="ctp-stat-icon"><RiTruckLine /></div>
            <div className="ctp-stat-value">{money(totalShippingDue)}</div>
            <div className="ctp-stat-label">Shipping Charges Due</div>
            <div className="ctp-stat-sub">Courier Settlements</div>
          </div>
        </div>
      )}

      {/* Courier Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
        {['All', 'Shiprocket', 'DTDC', 'Manual', 'Unassigned'].map(c => (
          <button 
            key={c}
            onClick={() => { setCourierFilter(c); setCurrentPage(1); }}
            style={{ 
              padding: '6px 12px', 
              borderRadius: '20px', 
              border: courierFilter === c ? 'none' : '1px solid #ccc',
              background: courierFilter === c ? '#2d5a1b' : '#fff',
              color: courierFilter === c ? '#fff' : '#555',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px'
            }}
          >
            {c} Assigned
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="ctp-tabs">
        <button className={`ctp-tab ${activeTab === 'cod' ? 'active' : ''}`} onClick={() => setActiveTab('cod')}>
          <RiBankCardLine style={{ marginRight: 4, verticalAlign: 'middle' }} /> COD Collections ({codOrders.length})
        </button>
        <button className={`ctp-tab ${activeTab === 'online' ? 'active' : ''}`} onClick={() => setActiveTab('online')}>
          <RiLock2Line style={{ marginRight: 4, verticalAlign: 'middle' }} /> Online Courier Charges ({onlineOrders.length})
        </button>
      </div>

      {loading ? <div className="ctp-loading">Loading tracker data...</div> : (
        <div className="ctp-table-wrapper">
          {activeTab === 'cod' ? (
            <table className="ctp-table">
              <thead>
                <tr>
                  <th>Order ID & Customer</th>
                  <th>Courier</th>
                  <th>Total COD Amount</th>
                  <th>Received Amount</th>
                  <th>Remaining Balance</th>
                  <th>Settlement Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.length === 0 ? (
                  <tr><td colSpan="7" className="ctp-empty-td">No COD orders found</td></tr>
                ) : paginatedList.map(order => {
                  const total = Number(order.totalAmount || 0);
                  const received = Number(order.codReceivedAmount || 0);
                  const remaining = Math.max(0, total - received);
                  const status = order.codAmountStatus || 'pending';

                  return (
                    <tr key={order.orderId}>
                      <td>
                        <div className="ctp-cell-main">#{order.orderId}</div>
                        <div className="ctp-cell-sub">{order.snapName || order.Customer?.name || 'N/A'} • {order.snapPhone || ''}</div>
                      </td>
                      <td>
                        <span className="ctp-courier-tag">{order.courierPartner || 'Manual/Unassigned'}</span>
                      </td>
                      <td className="ctp-amount-col"><strong>{money(total)}</strong></td>
                      <td className="ctp-amount-col text-success">{money(received)}</td>
                      <td className="ctp-amount-col text-danger"><strong>{money(remaining)}</strong></td>
                      <td>
                        <span className={`ctp-badge is-${status}`}>
                          {status === 'paid' ? 'Fully Paid' : status === 'partial' ? 'Partial Paid' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="ctp-action-btn"
                          disabled={updating === order.orderId}
                          onClick={() => handleOpenSettlement(order)}
                        >
                          Update Settlement
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="ctp-table">
              <thead>
                <tr>
                  <th>Order ID & Customer</th>
                  <th>Courier Partner</th>
                  <th>Order Status</th>
                  <th>Order Total</th>
                  <th>Actual Courier Cost</th>
                  <th>Courier Settlement</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.length === 0 ? (
                  <tr><td colSpan="6" className="ctp-empty-td">No online orders found</td></tr>
                ) : paginatedList.map(order => (
                  <tr key={order.orderId}>
                    <td>
                      <div className="ctp-cell-main">#{order.orderId}</div>
                      <div className="ctp-cell-sub">{order.snapName || order.Customer?.name || 'N/A'}</div>
                    </td>
                    <td><span className="ctp-courier-tag">{order.courierPartner || 'Unassigned'}</span></td>
                    <td><strong>{order.orderStatus}</strong></td>
                    <td><strong>{money(order.totalAmount)}</strong></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        ₹<input 
                          type="number" 
                          step="0.01"
                          placeholder={order.courierShippingCost || '0.00'}
                          value={costInputs[order.orderId] !== undefined ? costInputs[order.orderId] : (order.courierShippingCost || '')}
                          onChange={e => setCostInputs({...costInputs, [order.orderId]: e.target.value})}
                          style={{ width: '70px', padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                        <button 
                          onClick={() => handleSaveCourierCost(order, costInputs[order.orderId] !== undefined ? costInputs[order.orderId] : order.courierShippingCost)}
                          style={{ background: '#2d5a1b', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Save
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className={`ctp-badge is-${order.courierPaymentStatus === 'Paid' ? 'paid' : 'pending'}`}>
                        {order.courierPaymentStatus === 'Paid' ? 'Paid to Courier' : 'Unpaid'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="ctp-pagination">
              <button
                className="ctp-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <RiArrowLeftSLine /> Prev
              </button>
              <div className="ctp-page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    className={`ctp-page-num ${currentPage === p ? 'active' : ''}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                className="ctp-page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Next <RiArrowRightSLine />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Settlement Action Modal */}
      {settlementModal.open && settlementModal.order && (() => {
        const ord = settlementModal.order;
        const total = Number(ord.totalAmount || 0);
        const inputVal = Number(receivedInput || 0);
        const computedRemaining = settlementMode === 'FULL' ? 0 : Math.max(0, total - inputVal);

        return (
          <div className="ctp-modal-overlay" onClick={() => setSettlementModal({ open: false, order: null })}>
            <div className="ctp-modal-content" onClick={e => e.stopPropagation()}>
              <h2>Update COD Settlement - Order #{ord.orderId}</h2>
              <p className="ctp-modal-sub">Customer: <strong>{ord.snapName || ord.Customer?.name}</strong> | Total COD Amount: <strong>{money(total)}</strong></p>

              <div className="ctp-mode-selector">
                <button
                  type="button"
                  className={`ctp-mode-btn ${settlementMode === 'PARTIAL' ? 'active' : ''}`}
                  onClick={() => setSettlementMode('PARTIAL')}
                >
                  Partial Remittance
                </button>
                <button
                  type="button"
                  className={`ctp-mode-btn ${settlementMode === 'FULL' ? 'active' : ''}`}
                  onClick={() => setSettlementMode('FULL')}
                >
                  Fully Paid ({money(total)})
                </button>
              </div>

              {settlementMode === 'PARTIAL' && (
                <div className="ctp-input-group">
                  <label>Enter Received Amount from Courier (₹):</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 500"
                    value={receivedInput}
                    onChange={e => setReceivedInput(e.target.value)}
                    className="ctp-amount-input"
                  />
                  <div className="ctp-calc-preview">
                    <span>Received: <strong>{money(inputVal)}</strong></span>
                    <span>Remaining Balance: <strong style={{ color: '#d9534f' }}>{money(computedRemaining)}</strong></span>
                  </div>
                </div>
              )}

              {settlementMode === 'FULL' && (
                <div className="ctp-calc-preview full">
                  <span>Total Settled: <strong>{money(total)}</strong></span>
                  <span>Remaining Balance: <strong style={{ color: '#5cb85c' }}>₹0.00</strong></span>
                </div>
              )}

              <div className="ctp-modal-footer">
                <button type="button" className="ctp-modal-cancel" onClick={() => setSettlementModal({ open: false, order: null })}>Cancel</button>
                <button type="button" className="ctp-modal-save" onClick={handleSaveSettlement}>Save Settlement</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

