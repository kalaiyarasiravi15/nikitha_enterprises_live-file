import React, { useState } from 'react';
import { 
  FiCheckCircle, 
  FiPackage, 
  FiTruck, 
  FiMapPin, 
  FiCheck, 
  FiClock, 
  FiExternalLink,
  FiCopy,
  FiCheck as FiCopiedCheck
} from 'react-icons/fi';
import './OrderTrackingStepper.css';

const STAGES = [
  { id: 'placed', title: 'Order Placed', icon: FiCheckCircle, desc: 'Order confirmed' },
  { id: 'packed', title: 'Packed & Assigned', icon: FiPackage, desc: 'Ready for courier' },
  { id: 'shipped', title: 'In Transit', icon: FiTruck, desc: 'On the way' },
  { id: 'out_for_delivery', title: 'Out for Delivery', icon: FiMapPin, desc: 'Arriving at local hub' },
  { id: 'delivered', title: 'Delivered', icon: FiCheck, desc: 'Package delivered' }
];

export default function OrderTrackingStepper({ order = {}, trackingData = null }) {
  const [copied, setCopied] = useState(false);

  const status = (order.orderStatus || order.status || trackingData?.currentStatus || 'Pending').toLowerCase();
  const courierName = trackingData?.courier || order.courierPartner || 'Courier Partner';
  const awbCode = trackingData?.trackingNumber || order.awb_code || 'N/A';
  const trackingUrl = trackingData?.tracking_url || order.tracking_url;
  const events = trackingData?.events || [];

  // Determine Active Stage Index (0..4)
  let activeStep = 0;
  if (status.includes('delivered')) {
    activeStep = 4;
  } else if (status.includes('out for delivery') || status.includes('out_for_delivery')) {
    activeStep = 3;
  } else if (status.includes('shipped') || status.includes('transit') || status.includes('pickup_accepted') || status.includes('pickup_scheduled') || events.length > 0) {
    activeStep = 2;
  } else if (status.includes('confirmed') || order.courierPartner) {
    activeStep = 1;
  } else {
    activeStep = 0;
  }

  const handleCopyAwb = () => {
    if (!awbCode || awbCode === 'N/A') return;
    navigator.clipboard.writeText(awbCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Headline Status Text
  const getHeadline = () => {
    if (activeStep === 4) return 'Package Successfully Delivered';
    if (activeStep === 3) return 'Out for Delivery — Expected Today';
    if (activeStep === 2) return `In Transit with ${courierName}`;
    if (activeStep === 1) return 'Order Packed & Courier Assigned';
    return 'Order Placed & Confirmed';
  };

  return (
    <div className="ots-container">
      {/* 1. Header Banner */}
      <div className="ots-header">
        <div className="ots-header-info">
          <span className="ots-live-badge">
            <span className="ots-pulse-dot" /> LIVE TRACKING
          </span>
          <h3 className="ots-headline">{getHeadline()}</h3>
          
          <div className="ots-meta-row">
            <span className="ots-meta-item">
              <strong>Partner:</strong> {courierName}
            </span>
            {awbCode && awbCode !== 'N/A' && (
              <span className="ots-meta-item ots-awb-box">
                <strong>AWB:</strong> {awbCode}
                <button type="button" className="ots-copy-btn" onClick={handleCopyAwb} title="Copy AWB Code">
                  {copied ? <FiCopiedCheck style={{ color: '#16a34a' }} /> : <FiCopy />}
                </button>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Flipkart / Amazon Style 5-Stage Stepper Bar */}
      <div className="ots-stepper-bar">
        {STAGES.map((stage, idx) => {
          const isDone = idx < activeStep;
          const isCurrent = idx === activeStep;
          const IconComp = stage.icon;

          return (
            <div
              key={stage.id}
              className={`ots-step ${isDone ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''}`}
            >
              {/* Connector line */}
              {idx > 0 && <div className={`ots-connector ${idx <= activeStep ? 'is-filled' : ''}`} />}

              <div className="ots-step-node">
                <div className="ots-icon-circle">
                  {isDone ? <FiCheck /> : <IconComp />}
                </div>
                <div className="ots-step-label">{stage.title}</div>
                <div className="ots-step-sub">
                  {isCurrent ? (
                    <span className="ots-active-tag">Active</span>
                  ) : isDone ? (
                    <span className="ots-done-tag">Done</span>
                  ) : (
                    stage.desc
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Detailed Scan Timeline (Reverse Chronological) */}
      <div className="ots-timeline-section">
        <h4 className="ots-timeline-title">
          <FiClock className="ots-clock-icon" /> Shipment Activity History
        </h4>

        {events.length > 0 ? (
          <div className="ots-timeline-list">
            {events.map((evt, idx) => (
              <div key={idx} className="ots-timeline-item">
                <div className="ots-timeline-dot" />
                <div className="ots-timeline-content">
                  <div className="ots-timeline-status">{evt.status || 'Scan Update'}</div>
                  <div className="ots-timeline-meta">
                    {[evt.location, formatDate(evt.dateTime)].filter(Boolean).join(' • ') || 'Scanned by courier'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ots-timeline-item">
            <div className="ots-timeline-dot" />
            <div className="ots-timeline-content">
              <div className="ots-timeline-status">
                {activeStep >= 2 ? 'In Transit — Awaiting Next Hub Scan' : 'Shipment Booked — Awaiting Courier Pickup'}
              </div>
              <div className="ots-timeline-meta">
                {order.createdAt ? `Order Placed on ${formatDate(order.createdAt)}` : 'Courier update in progress'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
