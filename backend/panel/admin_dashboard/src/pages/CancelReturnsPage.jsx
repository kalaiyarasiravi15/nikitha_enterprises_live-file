import React, { useState, useEffect } from 'react';
import { API, IMG } from '../config';
import { toast } from 'react-toastify';
import {
  RiArrowGoBackLine, RiListCheck2, RiBox3Line, RiTruckLine,
  RiCheckLine, RiCloseLine, RiMoneyDollarCircleLine,
  RiLock2Line, RiBankCardLine, RiRefreshLine, RiVideoLine, RiFileCopyLine,
  RiCalendarEventLine, RiArrowLeftSLine, RiArrowRightSLine, RiEyeLine
} from 'react-icons/ri';
import './CancelReturnsPage.css';

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const parseImages = (rawImages) => {
  if (!rawImages) return [];
  if (Array.isArray(rawImages)) return rawImages;
  if (typeof rawImages === 'string') {
    try {
      const parsed = JSON.parse(rawImages);
      return Array.isArray(parsed) ? parsed : [rawImages];
    } catch {
      return [rawImages];
    }
  }
  return [];
};

const CANCEL_TYPE_LABELS = {
  PRE_DISPATCH: 'Pre-Dispatch',
  IN_TRANSIT: 'In Transit',
  POST_DELIVERY: 'Post-Delivery'
};

const CANCEL_TYPE_ICONS = {
  PRE_DISPATCH: RiBox3Line,
  IN_TRANSIT: RiTruckLine,
  POST_DELIVERY: RiRefreshLine
};

const STATUS_COLORS = {
  REQUESTED: { bg: '#fff3cd', color: '#856404' },
  APPROVED: { bg: '#d1e7dd', color: '#0f5132' },
  REJECTED: { bg: '#f8d7da', color: '#842029' },
  COURIER_NOTIFIED: { bg: '#cff4fc', color: '#0c5460' },
  RETURN_PICKUP: { bg: '#e2d9f3', color: '#432874' },
  PRODUCT_RECEIVED: { bg: '#d1e7dd', color: '#0f5132' },
  REFUND_INITIATED: { bg: '#cff4fc', color: '#0c5460' },
  REFUNDED: { bg: '#d1e7dd', color: '#0f5132' },
};

export default function CancelReturnsPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('');
  const [refundModal, setRefundModal] = useState({ open: false, cancellation: null });
  const [cancellations, setCancellations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [detailsModal, setDetailsModal] = useState({ open: false, cancellation: null });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Pickup Scheduling Modal
  const [pickupModal, setPickupModal] = useState({ open: false, cancellation: null });
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTimeSlot, setPickupTimeSlot] = useState('10:00 AM - 05:00 PM');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'ALL') params.set('cancelType', activeTab);
      if (statusFilter) params.set('status', statusFilter);
      
      const r = await fetch(`${API}/cancellations?${params}`);
      const d = await r.json();
      if (d.success) {
        const formatted = (d.data || []).map(c => {
          if (c.status === 'REQUESTED' && (c.Order?.orderStatus === 'Cancelled' || c.Order?.orderStatus === 'Returned')) {
            return { ...c, status: 'APPROVED' };
          }
          return c;
        });
        setCancellations(formatted);
      }
    } catch (e) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [activeTab, statusFilter]);
  useEffect(() => { setCurrentPage(1); }, [activeTab, statusFilter]);

  const handleApproveClick = (c) => {
    if (c.cancelType === 'POST_DELIVERY' || c.cancelType === 'IN_TRANSIT') {
      // Default pickup date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setPickupDate(tomorrow.toISOString().split('T')[0]);
      setPickupTimeSlot('10:00 AM - 05:00 PM');
      setPickupModal({ open: true, cancellation: c });
    } else {
      executeApprove(c.id, null, null);
    }
  };

  const executeApprove = async (id, pDate, pSlot) => {
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/cancellations/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: 1, pickupDate: pDate, pickupTimeSlot: pSlot })
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      toast.success(pDate ? 'Approved & Pickup email sent to customer!' : 'Cancellation Approved!');
      setPickupModal({ open: false, cancellation: null });
      fetchData();
    } catch (e) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  const handleAction = async (id, action) => {
    try {
      const r = await fetch(`${API}/cancellations/${id}/${action}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: 1 })
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      toast.success(d.message || 'Done!');
      if (action === 'initiate-refund') {
        if (d.upiId) {
          toast.info(`Refund ${money(d.amount)} via UPI: ${d.upiId}`);
        } else {
          toast.info(`Refund ${money(d.amount)} back to Original Payment Account`);
        }
      }
      fetchData();
    } catch (e) { toast.error(e.message); }
  };

  const requestedCount = cancellations.filter(c => c.status === 'REQUESTED').length;
  const refundDue = cancellations.filter(c => c.status === 'APPROVED' && c.refundStatus === 'PENDING').reduce((s, c) => s + Number(c.refundAmount || 0), 0);

  const renderTypeLabel = (cancelType) => {
    const Icon = CANCEL_TYPE_ICONS[cancelType];
    return Icon ? <><Icon style={{ marginRight: 4, verticalAlign: 'middle' }} />{CANCEL_TYPE_LABELS[cancelType]}</> : CANCEL_TYPE_LABELS[cancelType];
  };

  const totalPages = Math.ceil(cancellations.length / itemsPerPage) || 1;
  const paginatedList = cancellations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="crp-page">
      <div className="crp-header">
        <h1><RiArrowGoBackLine style={{ marginRight: 8, verticalAlign: 'middle' }} />Cancel & Returns Management</h1>
        <div className="crp-header-stats">
          {requestedCount > 0 && <span className="crp-alert-badge">{requestedCount} Pending Review</span>}
          {refundDue > 0 && <span className="crp-refund-badge">Refund Due: {money(refundDue)}</span>}
        </div>
      </div>

      {/* Type Tabs */}
      <div className="crp-tabs">
        {['ALL', 'PRE_DISPATCH', 'IN_TRANSIT', 'POST_DELIVERY'].map(t => (
          <button key={t} className={`crp-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {t === 'ALL' ? <><RiListCheck2 style={{ marginRight: 4, verticalAlign: 'middle' }} />All</> : renderTypeLabel(t)}
          </button>
        ))}
      </div>

      {/* Status Filter */}
      <div className="crp-filters">
        {['', 'REQUESTED', 'APPROVED', 'REJECTED', 'REFUND_INITIATED', 'REFUNDED'].map(s => (
          <button key={s} className={`crp-filter-btn ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
            {s || 'All Status'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? <div className="crp-loading">Loading...</div> : (
        <>
          
          <div className="crp-table-container">
            {paginatedList.length === 0 ? <div className="crp-empty">No cancellation requests found</div> : (
              <table className="crp-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Cancel Type</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Refund</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map(c => {
                    const orderIsResolved = c.Order?.orderStatus === 'Cancelled' || c.Order?.orderStatus === 'Returned';
                    return (
                      <tr key={c.id}>
                        <td><strong>#{c.orderId}</strong><br/><small>{new Date(c.createdAt).toLocaleDateString('en-IN')}</small></td>
                        <td>{c.Order?.snapName || 'N/A'}<br/><small>{c.Order?.snapState || ''}</small></td>
                        <td><span className="crp-type-badge">{renderTypeLabel(c.cancelType)}</span></td>
                        <td><span className="crp-status-badge" style={STATUS_COLORS[c.status] || {}}>{c.status?.replace(/_/g, ' ')}</span></td>
                        <td>
                          {c.Order?.paymentMethod === 'Online' && <span className="crp-payment-type online"><RiLock2Line style={{ marginRight: 3 }} /> Online</span>}
                          {c.Order?.paymentMethod === 'COD' && <span className="crp-payment-type cod"><RiMoneyDollarCircleLine style={{ marginRight: 3 }} /> COD</span>}
                        </td>
                        <td><strong>{money(c.refundAmount)}</strong></td>
                        <td>
                          <div className="crp-table-actions">
                              <button className="crp-btn-text view" onClick={() => setDetailsModal({ open: true, cancellation: c })} title="View Details">
                                <RiEyeLine style={{marginRight:4}} /> View
                              </button>
                            
                            {c.status === 'REQUESTED' && (
                              <>
                                  <button className="crp-btn-text approve" onClick={() => handleApproveClick(c)} title="Approve"><RiCheckLine style={{marginRight:4}}/> Approve</button>
                                  <button className="crp-btn-text reject" onClick={() => handleAction(c.id, 'reject')} title="Reject"><RiCloseLine style={{marginRight:4}}/> Reject</button>
                              </>
                            )}
                              {c.status === 'APPROVED' && (c.cancelType === 'POST_DELIVERY' || c.cancelType === 'IN_TRANSIT') && (
                                <button className="crp-btn-text received" onClick={() => handleAction(c.id, 'product-received')} title="Mark Received"><RiBox3Line style={{marginRight:4}}/> Received</button>
                              )}
                              {(c.status === 'PRODUCT_RECEIVED' || (c.status === 'APPROVED' && c.cancelType === 'PRE_DISPATCH')) && c.refundStatus === 'PENDING' && (
                                <button className="crp-btn-text refund" onClick={() => setRefundModal({ open: true, cancellation: c })} title="Process Refund"><RiMoneyDollarCircleLine style={{marginRight:4}}/> Refund</button>
                              )}
                              {c.status === 'REFUND_INITIATED' && (
                                <button className="crp-btn-text complete" onClick={() => handleAction(c.id, 'complete-refund')} title="Complete Refund"><RiCheckLine style={{marginRight:4}}/> Complete</button>
                              )}
                            
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="crp-pagination">
              <button
                className="crp-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <RiArrowLeftSLine /> Prev
              </button>
              <div className="crp-page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    className={`crp-page-num ${currentPage === p ? 'active' : ''}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                className="crp-page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Next <RiArrowRightSLine />
              </button>
            </div>
          )}
        </>
      )}

      {/* Scheduled Return Pickup Modal */}
      {pickupModal.open && (
        <div className="crp-modal" onClick={() => setPickupModal({ open: false, cancellation: null })}>
          <div className="crp-modal-inner" onClick={e => e.stopPropagation()}>
            <button className="crp-modal-close" onClick={() => setPickupModal({ open: false, cancellation: null })}><RiCloseLine /></button>
            <h2>Schedule Return Pickup</h2>
            <p className="crp-modal-sub">Order #{pickupModal.cancellation?.orderId} • Customer will receive an automated email</p>
            <div className="crp-field-group">
              <label>Select Pickup Date:</label>
              <input
                type="date"
                value={pickupDate}
                onChange={e => setPickupDate(e.target.value)}
                className="crp-input"
              />
            </div>
            <div className="crp-field-group">
              <label>Select Time Slot:</label>
              <select value={pickupTimeSlot} onChange={e => setPickupTimeSlot(e.target.value)} className="crp-input">
                <option value="10:00 AM - 01:00 PM">10:00 AM - 01:00 PM</option>
                <option value="01:00 PM - 05:00 PM">01:00 PM - 05:00 PM</option>
                <option value="10:00 AM - 05:00 PM">Full Day Slot (10:00 AM - 05:00 PM)</option>
              </select>
            </div>
            <div className="crp-modal-footer">
              <button type="button" className="crp-btn-cancel" onClick={() => setPickupModal({ open: false, cancellation: null })}>Cancel</button>
              <button
                type="button"
                className="crp-btn-confirm"
                disabled={submitting || !pickupDate}
                onClick={() => executeApprove(pickupModal.cancellation.id, pickupDate, pickupTimeSlot)}
              >
                {submitting ? 'Scheduling...' : 'Approve & Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* Details Modal */}
      {detailsModal.open && detailsModal.cancellation && (() => {
        const c = detailsModal.cancellation;
        const imagesList = parseImages(c.images);
        const orderIsResolved = c.Order?.orderStatus === 'Cancelled' || c.Order?.orderStatus === 'Returned';
        return (
          <div className="crp-modal" onClick={() => setDetailsModal({ open: false, cancellation: null })}>
            <div className="crp-modal-inner details-modal" onClick={e => e.stopPropagation()}>
              <button className="crp-modal-close" onClick={() => setDetailsModal({ open: false, cancellation: null })}><RiCloseLine /></button>
              <h2>Request Details - Order #{c.orderId}</h2>
              <div className="crp-details-content">
                <p><strong>Customer:</strong> {c.Order?.snapName || 'N/A'}</p>
                <p><strong>Order Status:</strong> {c.Order?.orderStatus}</p>
                
                {c.reasonCategory && <div className="crp-reason"><strong>Reason:</strong> {c.reasonCategory} — {c.reasonText}</div>}
                
                {c.Order?.paymentMethod === 'Online' && (
                  <div className="crp-upi-box">
                    {c.refundMethod === 'SAME_ACCOUNT' ? (
                      <p><RiLock2Line style={{ marginRight: 4, verticalAlign: 'middle' }} /> Refund Method: <strong>Original Payment Source (Same Account)</strong> | Refund Amount: <strong>{money(c.refundAmount)}</strong></p>
                    ) : (
                      <p><RiBankCardLine style={{ marginRight: 4, verticalAlign: 'middle' }} /> Refund Method: <strong>Custom UPI ID ({c.customerUpiId || 'Pending'})</strong> 
                        {c.customerUpiId && (
                          <button className="crp-copy-btn" style={{display: 'inline-flex', marginLeft: '10px'}} onClick={() => { navigator.clipboard.writeText(c.customerUpiId); toast.success('UPI ID Copied!'); }}>
                            <RiFileCopyLine /> Copy
                          </button>
                        )}
                        <br/> Refund Amount: <strong>{money(c.refundAmount)}</strong></p>
                    )}
                  </div>
                )}
                
                {c.Order?.paymentMethod === 'COD' && c.customerUpiId && (
                  <div className="crp-upi-box">
                    <p><RiBankCardLine style={{ marginRight: 4, verticalAlign: 'middle' }} /> COD Return Refund UPI ID: <strong>{c.customerUpiId}</strong>
                      <button className="crp-copy-btn" style={{display: 'inline-flex', marginLeft: '10px'}} onClick={() => { navigator.clipboard.writeText(c.customerUpiId); toast.success('UPI ID Copied!'); }}>
                        <RiFileCopyLine /> Copy
                      </button>
                    </p>
                  </div>
                )}
                
                {c.pickupDate && (
                  <div className="crp-pickup-info">
                    <p><RiCalendarEventLine style={{ marginRight: 4, verticalAlign: 'middle' }} /> Scheduled Return Pickup: <strong>{new Date(c.pickupDate).toLocaleDateString('en-IN')}</strong> ({c.pickupTimeSlot || 'Standard Slot'})</p>
                  </div>
                )}
                
                <div className="crp-media-section">
                  {imagesList.length > 0 && (
                    <div className="crp-images">
                      {imagesList.map((img, i) => (
                        <img
                          key={i}
                          src={`${IMG}cancellations/${img}`}
                          alt={`Return image ${i + 1}`}
                          className="crp-thumb"
                          onClick={() => setSelectedImages({ images: imagesList, index: i })}
                        />
                      ))}
                    </div>
                  )}
                  {c.video && (
                    <button
                      type="button"
                      className="crp-video-btn"
                      onClick={() => setSelectedVideo(c.video.startsWith('http') ? c.video : `${IMG}cancellations/${c.video}`)}
                    >
                      <RiVideoLine style={{ marginRight: 4 }} /> View Defect Video
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      
      {/* Refund Processing Modal */}
      {refundModal.open && refundModal.cancellation && (() => {
        const c = refundModal.cancellation;
        return (
          <div className="crp-modal" onClick={() => setRefundModal({ open: false, cancellation: null })}>
            <div className="crp-modal-inner refund-modal" onClick={e => e.stopPropagation()}>
              <button className="crp-modal-close" onClick={() => setRefundModal({ open: false, cancellation: null })}><RiCloseLine /></button>
              <h2>Process Refund - Order #{c.orderId}</h2>
              <p className="crp-modal-sub">Amount to refund: <strong>{money(c.refundAmount)}</strong></p>
              
              <div className="crp-refund-box">
                {c.refundMethod === 'SAME_ACCOUNT' ? (
                  <>
                    <div className="crp-method-label"><RiLock2Line style={{marginRight:6}}/> Refund to Original Source (Same Account)</div>
                    <p className="crp-method-desc">Please process this refund directly from your Payment Gateway (e.g., Razorpay/HDFC) dashboard.</p>
                  </>
                ) : (
                  <>
                    <div className="crp-method-label"><RiBankCardLine style={{marginRight:6}}/> Refund via Custom UPI</div>
                    <div className="crp-upi-copy-box">
                      <code>{c.customerUpiId || 'No UPI Provided'}</code>
                      {c.customerUpiId && (
                        <button className="crp-copy-btn" onClick={() => { navigator.clipboard.writeText(c.customerUpiId); toast.success('UPI ID Copied!'); }}>
                          <RiFileCopyLine /> Copy
                        </button>
                      )}
                    </div>
                    <p className="crp-method-desc">Please transfer {money(c.refundAmount)} to the above UPI ID using your preferred UPI app.</p>
                  </>
                )}
              </div>

              <div className="crp-modal-footer" style={{ marginTop: '20px' }}>
                <button type="button" className="crp-btn-cancel" onClick={() => setRefundModal({ open: false, cancellation: null })}>Cancel</button>
                <button
                  type="button"
                  className="crp-btn-confirm"
                  style={{ background: '#6f42c1' }}
                  onClick={() => {
                    handleAction(c.id, 'complete-refund');
                    setRefundModal({ open: false, cancellation: null });
                  }}
                >
                  <RiCheckLine style={{marginRight:4}}/> Mark Refund Completed
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Image Modal */}
      {selectedImages && (
        <div className="crp-modal" onClick={() => setSelectedImages(null)}>
          <div className="crp-modal-inner" onClick={e => e.stopPropagation()}>
            <button className="crp-modal-close" onClick={() => setSelectedImages(null)}><RiCloseLine /></button>
            <img src={`${IMG}cancellations/${selectedImages.images[selectedImages.index]}`} alt="Return" />
          </div>
        </div>
      )}

      {/* Video Modal */}
      {selectedVideo && (
        <div className="crp-modal" onClick={() => setSelectedVideo(null)}>
          <div className="crp-modal-inner" onClick={e => e.stopPropagation()}>
            <button className="crp-modal-close" onClick={() => setSelectedVideo(null)}><RiCloseLine /></button>
            <video src={selectedVideo} controls autoPlay style={{ width: '100%', maxHeight: '75vh', borderRadius: 8 }} />
          </div>
        </div>
      )}
    </div>
  );
}
