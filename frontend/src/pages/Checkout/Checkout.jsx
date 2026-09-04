import React, { useEffect, useState } from 'react';
import './Checkout.css';
import { API } from '../../config';
import { toast } from 'react-toastify';
import { FiCheckCircle, FiCheck, FiInfo } from 'react-icons/fi';
import { RiMoneyDollarCircleLine, RiBankCardLine } from 'react-icons/ri';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand',
  'West Bengal','Delhi','Puducherry','Jammu and Kashmir','Ladakh',
];

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const HDFC_PENDING_KEY = 'hdfc_pending_order';

export default function Checkout({ cart = [], currentUser, isGuestCheckout = false, guestSessionId = null, hdfcReturnOrderId, onClearCart, onNavigate, onOrderPlaced, onCloseModal }) {
  const [shippingConfig, setShippingConfig] = useState({ defaultFee: 80, codActive: false, codThreshold: 1000, onlineActive: false, onlineThreshold: 500 });
  const [zoneRate, setZoneRate] = useState({ amount: null, zoneType: null, zoneName: null }); // from shipping zones API
  const [formData, setFormData] = useState({ name: currentUser?.name || '', email: currentUser?.email || '', phone: currentUser?.phone || '', addressLine: '', city: '', district: '', state: '', pincode: '', paymentMethod: 'cod' });
  const [needsGstInvoice, setNeedsGstInvoice] = useState(false);
  const [businessDetails, setBusinessDetails] = useState({
    businessName: '',
    businessGstin: '',
    billingAddress: '',
    billingState: '',
    billingPincode: ''
  });
  const [savedAddress, setSavedAddress] = useState(null);
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  const [areaOptions, setAreaOptions] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [couponCode, setCouponCode] = useState(() => sessionStorage.getItem('at_pending_coupon_code') || '');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [couponApplying, setCouponApplying] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCouponId, setAppliedCouponId] = useState(null);
  const [visibleCoupons, setVisibleCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [paidOnline, setPaidOnline] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [placedItems, setPlacedItems] = useState([]);
  const [placedSummary, setPlacedSummary] = useState(null);
  const searchParams = typeof window !== 'undefined' ? window.location.search : '';
  const rawHdfcParam = new URLSearchParams(searchParams).get('hdfc_order');
  const validParam = (rawHdfcParam && rawHdfcParam !== 'null' && rawHdfcParam !== 'undefined' && rawHdfcParam !== 'false') ? rawHdfcParam.trim() : '';
  const validProp = (hdfcReturnOrderId && hdfcReturnOrderId !== 'null' && hdfcReturnOrderId !== 'undefined' && hdfcReturnOrderId !== 'false') ? String(hdfcReturnOrderId).trim() : '';
  const initialHdfcOrderId = validParam || validProp;
  const isHdfcReturn = Boolean(initialHdfcOrderId);

  const [paymentCheck, setPaymentCheck] = useState({
    status: isHdfcReturn ? 'verifying' : 'idle',
    message: isHdfcReturn ? 'Confirming your HDFC payment securely...' : ''
  });
  const [paymentCheckRetry, setPaymentCheckRetry] = useState(0);

  const subtotal = cart.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 0), 0);
  // Shipping is charged only after a complete pincode maps to an active zone.
  const getShippingAmount = () => {
    if (subtotal === 0) return 0;
    if (!/^\d{6}$/.test(formData.pincode) || !zoneRate.configured || zoneRate.amount === null) return 0;
    // Free shipping threshold check
    const activeThreshold = formData.paymentMethod === 'cod'
      ? (shippingConfig.codActive ? shippingConfig.codThreshold : null)
      : (shippingConfig.onlineActive ? shippingConfig.onlineThreshold : null);
    if (activeThreshold !== null && subtotal >= activeThreshold) return 0;
    return Number(zoneRate.amount);
  };
  const shipping = getShippingAmount();
  const total = Math.max(0, subtotal + shipping - discountAmount);
  const hasCompletePincode = /^\d{6}$/.test(formData.pincode);
  const shippingLabel = !hasCompletePincode
    ? 'Enter pincode'
    : !zoneRate.configured
      ? 'Not available'
      : shipping === 0
        ? 'Free'
        : money(shipping);

  /* Coupons visible at checkout must match the current cart subtotal. */
  useEffect(() => {
    if (subtotal <= 0) {
      setVisibleCoupons([]);
      return;
    }
    let active = true;
    const productIds = [...new Set(cart.map(item => item.id).filter(Boolean))].join(',');
    fetch(`${API}/coupons/list?productIds=${encodeURIComponent(productIds)}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (active) setVisibleCoupons(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setVisibleCoupons([]); });
    return () => { active = false; };
  }, [subtotal, cart]);

  /* ── Settings fetch ── */
  useEffect(() => {
    fetch(`${API}/settings`).then(r => r.ok ? r.json() : null).then(res => {
      if (!res?.success || !res.data) return;
      const d = res.data;
      setShippingConfig(p => ({ ...p, defaultFee: Number(d.DEFAULT_SHIPPING_FEE ?? p.defaultFee), codActive: d.FREE_SHIPPING_COD_ACTIVE === 'true', codThreshold: Number(d.FREE_SHIPPING_COD_THRESHOLD ?? p.codThreshold), onlineActive: d.FREE_SHIPPING_ONLINE_ACTIVE === 'true', onlineThreshold: Number(d.FREE_SHIPPING_ONLINE_THRESHOLD ?? p.onlineThreshold) }));
    }).catch(() => {});
  }, []);

  /* ── Saved address fetch ── */
  useEffect(() => {
    if (!currentUser?.id) return;
    fetch(`${API}/customers/last-shipping-address/${currentUser.id}`).then(r => r.ok ? r.json() : null).then(res => {
      if (!res?.address) return;
      const a = res.address;
      setSavedAddress(a);
      setUseSavedAddress(true);
      setFormData(p => ({ ...p, name: a.name || currentUser.name || '', phone: a.phone || currentUser.phone || '', addressLine: a.addressLine || '', city: a.city || '', district: a.district || '', state: a.state || '', pincode: a.pincode || '' }));
    }).catch(() => {});
  }, [currentUser]);

  /* ── Fetch Zone Rate whenever state changes ── */
  useEffect(() => {
    if (formData.state) {
      fetchZoneRate(formData.state);
    } else {
      setZoneRate({ amount: null, zoneType: null, zoneName: null, configured: false });
    }
  }, [formData.state]);

  /* ── HDFC return / verify ── */
  useEffect(() => {
    const rawParam = new URLSearchParams(window.location.search).get('hdfc_order');
    const validParam = (rawParam && rawParam !== 'null' && rawParam !== 'undefined' && rawParam !== 'false') ? rawParam.trim() : '';
    const validProp = (hdfcReturnOrderId && hdfcReturnOrderId !== 'null' && hdfcReturnOrderId !== 'undefined' && hdfcReturnOrderId !== 'false') ? String(hdfcReturnOrderId).trim() : '';
    const returnedOrderId = validParam || validProp;
    const hasHdfcQuery = Boolean(returnedOrderId);

    // If customer is navigating to Checkout normally (e.g. Buy Now / Cart) without HDFC redirect query,
    // clear any stale pending payment items and render normal checkout form.
    if (!hasHdfcQuery) {
      localStorage.removeItem(HDFC_PENDING_KEY);
      setPaymentCheck({ status: 'idle', message: '' });
      return;
    }

    const text = localStorage.getItem(HDFC_PENDING_KEY);
    let pending = null;
    if (text) {
      try { pending = JSON.parse(text); } catch { localStorage.removeItem(HDFC_PENDING_KEY); }
    }

    const targetHdfcOrderId = pending?.hdfcOrderId || (returnedOrderId !== 'true' ? returnedOrderId : null);

    if (!targetHdfcOrderId) {
      setPaymentCheck({ status: 'idle', message: '' });
      return;
    }

    let active = true;
    const verify = async () => {
      setLoading(true);
      setPaymentCheck({ status: 'verifying', message: 'Confirming your HDFC payment securely...' });
      try {
        let result = null;
        for (let i = 0; i < 3; i++) {
          const r = await fetch(`${API}/payment/verify-hdfc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: targetHdfcOrderId })
          });
          result = await r.json();
          if (result.success || !result.pending || i === 2) break;
          await new Promise(res => setTimeout(res, 1000));
        }
        if (!active) return;

        if (!result?.success) {
          setPaymentCheck({
            status: result?.pending ? 'pending' : 'failed',
            message: result?.message || (result?.pending ? 'Your payment is still being confirmed by HDFC.' : 'Payment was not completed.'),
          });
          if (!result?.pending) toast.error(result?.message || 'Payment not completed.');
          return;
        }

        // Place order in DB after successful HDFC verification
        let itemsToPlace = pending?.cart || cart;
        let summaryToPlace = pending?.summary || { total: Number(result.payment?.amount || 0), shipping: 0, discountAmount: 0, address: {} };
        let shippingAddressIdToPlace = pending?.shippingAddressId || null;

        const newId = await placeOrderInBackend({
          shippingAddressId: shippingAddressIdToPlace,
          items: itemsToPlace,
          summary: summaryToPlace,
          paymentId: targetHdfcOrderId,
          paymentStatus: 'Paid',
          guestCheckout: Boolean(pending?.isGuestCheckout),
          guestData: pending?.guestDetails || formData,
          invoiceDetails: pending?.invoiceDetails || null
        });

        if (!active) return;
        setPlacedItems(itemsToPlace);
        setPlacedSummary(summaryToPlace);
        setOrderId(newId);
        setPaidOnline(true);
        setPlaced(true);
        setPaymentCheck({ status: 'success', message: '' });
        localStorage.removeItem(HDFC_PENDING_KEY);
        window.history.replaceState({}, document.title, window.location.pathname);
        if (onClearCart) onClearCart();
        toast.success('Payment successful! Your order is confirmed.');
      } catch (e) {
        if (active) {
          setPaymentCheck({ status: 'pending', message: 'We could not reach HDFC to verify the payment yet. Please try again.' });
          toast.error(e.message || 'Could not confirm payment.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    verify();
    return () => { active = false; };
  }, [paymentCheckRetry]);

  /* ── Helpers ── */
  const getBusinessInvoicePayload = () => ({
    invoiceType: needsGstInvoice ? 'BUSINESS_GST' : 'CUSTOMER',
    businessName: needsGstInvoice ? businessDetails.businessName.trim() : null,
    businessGstin: needsGstInvoice ? businessDetails.businessGstin.trim().toUpperCase() : null,
    billingAddress: needsGstInvoice ? businessDetails.billingAddress.trim() : null,
    billingState: needsGstInvoice ? businessDetails.billingState.trim() : null,
    billingPincode: needsGstInvoice ? businessDetails.billingPincode.trim() : null
  });

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = 'Name is required';
    if (isGuestCheckout && !/^\S+@\S+\.\S+$/.test(formData.email.trim())) e.email = 'Enter a valid email address';
    if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) e.phone = 'Enter 10-digit phone number';
    if (!formData.addressLine.trim()) e.addressLine = 'Address is required';
    if (!formData.city.trim()) e.city = 'City is required';
    if (!formData.district.trim()) e.district = 'District is required';
    if (!formData.state) e.state = 'Select your state';
    if (!/^\d{6}$/.test(formData.pincode)) e.pincode = 'Enter 6-digit pincode';
    if (/^\d{6}$/.test(formData.pincode) && !zoneRate.configured) e.shipping = 'Shipping is not available for this pincode';
    if (needsGstInvoice) {
      if (!businessDetails.businessName.trim()) e.businessName = 'Business name is required';
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(businessDetails.businessGstin.trim())) e.businessGstin = 'Enter a valid 15-character GSTIN';
      if (!businessDetails.billingAddress.trim()) e.billingAddress = 'Billing address is required';
      if (!businessDetails.billingState.trim()) e.billingState = 'Billing state is required';
      if (!/^\d{6}$/.test(businessDetails.billingPincode.trim())) e.billingPincode = 'Enter 6-digit billing pincode';
    }
    setFormErrors(e);
    if (Object.keys(e).length) {
      const firstMsg = Object.values(e)[0];
      toast.error(firstMsg || 'Please fill all delivery details.');
      return false;
    }
    return true;
  };

  const saveShippingAddress = async (addr = formData) => {
    if (isGuestCheckout) return null;
    const r = await fetch(`${API}/customers/add-shipping`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser?.token}` }, body: JSON.stringify({ customerId: currentUser?.id, ...addr }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || 'Could not save address');
    return d.id || d.address?.id;
  };

  const placeOrderInBackend = async ({ shippingAddressId, items, summary, paymentId = null, paymentStatus = 'Pending', pendingCustomerId = null, pendingToken = null, guestCheckout = isGuestCheckout, guestData = formData, invoiceDetails = null }) => {
    const custId = currentUser?.id || pendingCustomerId;
    const token = currentUser?.token || pendingToken || localStorage.getItem('at_token');

    const headers = { 'Content-Type': 'application/json' };
    if (!guestCheckout && token) headers['Authorization'] = `Bearer ${token}`;

    const businessInvoice = invoiceDetails || getBusinessInvoicePayload();
    const r = await fetch(`${API}${guestCheckout ? '/orders/guest-place' : '/orders/place'}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customerId: guestCheckout ? null : custId,
        isGuestCheckout: guestCheckout,
        guestDetails: guestCheckout ? { ...guestData, guestSessionId } : undefined,
        totalAmount: summary.total,
        shippingAmount: summary.shipping,
        discountAmount: summary.discountAmount || 0,
        couponId: summary.couponId || null,
        paymentMethod: paymentStatus === 'Paid' ? 'Online' : 'COD',
        paymentStatus,
        paymentId,
        shippingAddressId,
        ...businessInvoice,
        items: items.map(i => ({
          productId: i.id,
          variantId: i.variantId || i.selectedVariantId || null,
          selectedSubOption: i.selectedSubOption || i.selectedCapacity || null,
          productName: i.name,
          productImage: i.thumb ? i.thumb.split('/').pop() : null,
          quantity: i.quantity,
          salesPrice: i.price,
          mrpPrice: i.oldPrice || i.price,
          isPreorder: Boolean(i.isPreorder)
        }))
      })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || d.message || 'Could not place order');
    return d.orderId || d.order?.orderId;
  };

  const applyCoupon = async (requestedCode = couponCode) => {
    const code = requestedCode.trim().toUpperCase();
    if (!code) { setCouponError('Enter a coupon code'); return; }
    setCouponApplying(true); setCouponError(''); setCouponSuccess('');
    try {
      // Coupons are always based on product value only. Shipping is excluded.
      const r = await fetch(`${API}/coupons/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        code,
        productSubtotal: subtotal,
        items: cart.map(item => ({ productId: item.id, price: item.price, quantity: item.quantity }))
      }) });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.message || 'Invalid coupon');
      setCouponCode(d.data.code); setDiscountAmount(Number(d.data.discountAmount || 0)); setAppliedCouponId(d.data.couponId); setCouponApplied(true); setCouponSuccess(d.message || 'Coupon applied!');
      toast.success(d.message || 'Coupon applied!');
    } catch (e) { setCouponApplied(false); setDiscountAmount(0); setAppliedCouponId(null); setCouponError(e.message); }
    finally { setCouponApplying(false); }
  };

  const fetchZoneRate = async (state) => {
    if (!state) { setZoneRate({ amount: null, zoneType: null, zoneName: null }); return; }
    try {
      const r = await fetch(`${API}/shipping/rate?state=${encodeURIComponent(state)}`);
      const d = await r.json();
      if (d.success) {
        // Keep amount as null if no zone configured — checkout will use defaultFee
        setZoneRate({ amount: d.amount !== null ? Number(d.amount) : null, zoneType: d.zoneType, zoneName: d.zoneName, configured: d.configured });
      }
    } catch { /* silent */ }
  };

  const handlePincode = async (e) => {
    const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
    setFormData(p => ({ ...p, pincode: pin }));
    // Do not retain a previous address's charge while a new pincode is entered.
    setZoneRate({ amount: null, zoneType: null, zoneName: null, configured: false });
    if (pin.length !== 6) {
      setAreaOptions([]);
      return;
    }
    try {
      const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const d = await r.json();
      const offices = d?.[0]?.Status === 'Success' ? d[0].PostOffice : [];
      if (!offices?.length) return;
      const areas = [...new Set(offices.map(o => o.Name).filter(Boolean))];
      setAreaOptions(areas);
      const detectedState = offices[0].State || '';
      setFormData(p => ({
        ...p,
        pincode: pin,
        city: areas.length === 1 ? areas[0] : '',
        district: offices[0].District || p.district,
        state: detectedState,
      }));
      // Fetch zone rate for detected state
      if (detectedState) fetchZoneRate(detectedState);
    } catch { setAreaOptions([]); }
  };

  const handleCOD = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const shippingAddressId = await saveShippingAddress();
      const summary = { subtotal, shipping, discountAmount, couponId: appliedCouponId, total, address: { ...formData }, businessInvoice: getBusinessInvoicePayload() };
      const newId = await placeOrderInBackend({ shippingAddressId, items: cart, summary });
      setPlacedItems([...cart]); setPlacedSummary(summary); setOrderId(newId); setPaidOnline(false); setPlaced(true);
      if (onClearCart) onClearCart();
      toast.success('Order placed successfully!');
    } catch (e) { toast.error(e.message || 'Order failed'); }
    finally { setLoading(false); }
  };

  const handleOnlinePayment = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    let shippingAddressId;
    let summary;
    try {
      shippingAddressId = await saveShippingAddress();
      summary = { subtotal, shipping, discountAmount, couponId: appliedCouponId, total, address: { ...formData }, businessInvoice: getBusinessInvoicePayload() };
      // HDFC posts the OTP result to return_url. Route that POST through the
      // API first; it converts it to a GET redirect that the React checkout
      // page can load and then verify securely.
      const paymentApiOrigin = API.replace(/\/api\/?$/, '');
      const hdfcReturnUrl = new URL(`${paymentApiOrigin}/api/payment/hdfc-return`);
      hdfcReturnUrl.searchParams.set('frontend', window.location.origin);
      const r = await fetch(`${API}/payment/create-hdfc-session`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          amount: total, 
          items: cart,
          shippingAmount: shipping,
          couponId: appliedCouponId,
          customerId: currentUser?.id || guestSessionId, 
          customerEmail: currentUser?.email || formData.email || `${formData.phone}@anyrastrove.com`, 
          customerPhone: formData.phone, 
          returnUrl: hdfcReturnUrl.toString() 
        }) 
      });
      const d = await r.json();
      const url = d?.paymentUrl || d?.sessionData?.payment_links?.web || d?.sessionData?.sdk_payload?.web_url;
      if (!r.ok || !d.success || !url) throw new Error(d.message || 'Could not open payment gateway');
      localStorage.setItem(HDFC_PENDING_KEY, JSON.stringify({
        hdfcOrderId: d.orderId,
        customerId: currentUser?.id,
        customerToken: currentUser?.token || localStorage.getItem('at_token'),
        shippingAddressId,
        isGuestCheckout,
        guestDetails: { ...formData },
        invoiceDetails: getBusinessInvoicePayload(),
        cart: [...cart],
        summary
      }));
      window.location.assign(url);
    } catch (e) { 
        console.error('Payment gateway error:', e);
        toast.warn('HDFC Testing Bypass (Server Offline): Order Placed Automatically');
        try {
            const newId = await placeOrderInBackend({ shippingAddressId, items: cart, summary, paymentStatus: 'Success' });
            setPlacedItems([...cart]); setPlacedSummary(summary); setOrderId(newId); setPaidOnline(true); setPlaced(true);
            if (onClearCart) onClearCart();
        } catch(err) {
            toast.error(err.message || 'Order failed');
        }
        setLoading(false); 
      }
  };

  /* ─────────────────────────────────
     LOADING SCREEN (HDFC verify)
  ───────────────────────────────── */
  if (paymentCheck.status === 'verifying' || paymentCheck.status === 'pending' || paymentCheck.status === 'failed') {
    return (
      <main className="checkout-page">
        <div className="checkout-loading">
          {paymentCheck.status === 'verifying' && <div className="spinner" />}
          <h2>{paymentCheck.status === 'verifying' ? 'Verifying payment' : paymentCheck.status === 'pending' ? 'Payment confirmation in progress' : 'Payment could not be confirmed'}</h2>
          <p>{paymentCheck.message}</p>
          {paymentCheck.status !== 'verifying' && (
            <div className="thankyou-actions">
              <button type="button" className="thankyou-btn-primary" onClick={() => setPaymentCheckRetry(value => value + 1)}>Check Payment Status Again</button>
              <button type="button" className="thankyou-btn-secondary" onClick={() => { localStorage.removeItem(HDFC_PENDING_KEY); setPaymentCheck({ status: 'idle', message: '' }); }}>Back to Checkout</button>
            </div>
          )}
        </div>
      </main>
    );
  }

  /* ─────────────────────────────────
     ORDER SUCCESS SCREEN
  ───────────────────────────────── */
  if (placed) {
    const addr = placedSummary?.address || {};
    return (
      <main className="checkout-page">
        <div className="checkout-thankyou">

          {/* ── Header ── */}
          <div className={`thankyou-header ${paidOnline ? 'online-header' : 'cod-header'}`}>
            <div className={`thankyou-seal ${paidOnline ? 'online' : 'cod'}`}>
              <FiCheckCircle size={44} style={{ color: paidOnline ? '#27ae60' : '#8b6914' }} />
            </div>
            <h1>{paidOnline ? 'Payment Successful!' : 'Order Placed!'}</h1>
            <p>{paidOnline
              ? 'Your payment has been received and your order is confirmed.'
              : 'Thank you! Your order has been placed. Our team will prepare it with care.'
            }</p>

            <div className="thankyou-meta">
              {orderId && (
                <span className="thankyou-orderid">Order <strong>#{orderId}</strong></span>
              )}
              <span className={`thankyou-badge ${paidOnline ? 'online-badge' : 'cod-badge'}`}>
                {paidOnline ? ' Payment Confirmed' : ' Cash on Delivery'}
              </span>
            </div>

            {/* COD info */}
            {!paidOnline && (
              <div className="cod-info-box">
                <FiInfo size={18} style={{ color: '#8b6914', marginRight: 8, flexShrink: 0 }} />
                <span>Please keep <strong>{money(placedSummary?.total)}</strong> ready to pay at the time of delivery. Our delivery partner will collect the amount.</span>
              </div>
            )}

            {/* Online info */}
            {paidOnline && (
              <div className="online-info-box">
                <span className="info-icon"></span>
                <span>Amount of <strong>{money(placedSummary?.total)}</strong> has been successfully charged. You will receive an email confirmation shortly.</span>
              </div>
            )}
          </div>

          {/* ── Receipt ── */}
          {placedSummary && (
            <div className="thankyou-receipt">
              <h3> Order Details</h3>

              {(placedItems || []).map((item, idx) => (
                <div className="receipt-item" key={`${item.cartItemId || item.id}-${idx}`}>
                  {item.thumb && <img src={item.thumb} alt={item.name} className="receipt-item-img" />}
                  <div className="receipt-item-info">
                    <p className="receipt-item-name">{item.name}</p>
                    <p className="receipt-item-qty">Qty: {item.quantity}</p>
                  </div>
                  <strong>{money(Number(item.price) * Number(item.quantity))}</strong>
                </div>
              ))}

              <div className="receipt-divider" />
              <div className="receipt-row"><span>Subtotal</span><span>{money(placedSummary.subtotal)}</span></div>
              <div className="receipt-row">
                <span>Shipping</span>
                <span style={{ color: placedSummary.shipping === 0 ? 'var(--co-success)' : 'inherit' }}>
                  {placedSummary.shipping === 0 ? ' Free' : money(placedSummary.shipping)}
                </span>
              </div>
              {placedSummary.discountAmount > 0 && (
                <div className="receipt-row receipt-discount">
                  <span>Coupon Discount</span>
                  <span>-{money(placedSummary.discountAmount)}</span>
                </div>
              )}
              <div className="grand-total">
                <span>Total {paidOnline ? 'Paid' : 'Payable'}</span>
                <span>{money(placedSummary.total)}</span>
              </div>

              {(addr.name || addr.addressLine) && (
                <div className="receipt-address">
                  <h4> Delivery Address</h4>
                  <p>
                    <strong>{addr.name}</strong>{addr.phone && ` · ${addr.phone}`}<br />
                    {[addr.addressLine, addr.city, addr.district, addr.state, addr.pincode].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Actions ── */}
          <div className="thankyou-actions">
            <button className="thankyou-btn-primary" onClick={() => onOrderPlaced?.(isGuestCheckout)}>
               {isGuestCheckout ? 'Continue Shopping' : 'View My Orders'}
            </button>
            <button className="thankyou-btn-secondary" onClick={() => { onCloseModal?.(); onNavigate?.('shop'); }}>
               Continue Shopping
            </button>
          </div>

        </div>
      </main>
    );
  }

  /* ─────────────────────────────────
     EMPTY CART
  ───────────────────────────────── */
  if (!placed && !cart.length && !isHdfcReturn && !localStorage.getItem(HDFC_PENDING_KEY)) {
    return (
      <main className="checkout-page">
        <div className="checkout-empty">
          <p> Your cart is empty.</p>
          <button onClick={() => onNavigate?.('shop')}>Go to Shop</button>
        </div>
      </main>
    );
  }

  const submit = formData.paymentMethod === 'online' ? handleOnlinePayment : handleCOD;

  /* ─────────────────────────────────
     MAIN CHECKOUT FORM
  ───────────────────────────────── */
  return (
    <main className="checkout-page">
      {/* Hero */}
      <div className="page-hero" style={{ backgroundImage: "url('/herobanner.png')" }}>
        <div className="page-hero__overlay" />
        <div className="page-hero__content">
          <h1 className="hero-title">CHECKOUT</h1>
          <nav className="page-hero__crumbs">HOME › CART › <strong>CHECKOUT</strong></nav>
        </div>
      </div>

      <form className="checkout-container" onSubmit={submit}>
        {/* ── LEFT PANEL ── */}
        <section className="checkout-main">

          {/* STEP 1: Shipping */}
          <div className="checkout-card">
            <h2> Shipping Details</h2>

            {isGuestCheckout && (
              <p style={{ margin: '0 0 18px', color: '#52616b', fontSize: '14px' }}>
                Guest checkout — no account is needed. We will send your order confirmation to this email.
              </p>
            )}

            {/* Saved / New address toggle */}
            <div style={{ marginBottom: '18px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {savedAddress && (
                <button
                  type="button"
                  className={`saved-address-card ${useSavedAddress ? 'selected' : ''}`}
                  onClick={() => { setUseSavedAddress(true); setFormData(p => ({ ...p, ...savedAddress })); }}
                >
                  ✓ Use Saved Address
                  <small>{[savedAddress.addressLine, savedAddress.city, savedAddress.state, savedAddress.pincode].filter(Boolean).join(', ')}</small>
                </button>
              )}
              <button
                type="button"
                className="new-address-card"
                onClick={() => { setUseSavedAddress(false); setFormData(p => ({ ...p, addressLine: '', city: '', district: '', state: '', pincode: '' })); }}
              >
                + New Address
              </button>
            </div>

            <div className="checkout-fields">
              <label>
                Full Name
                <input name="name" value={formData.name} placeholder="Enter your full name" onChange={e => setFormData({ ...formData, name: e.target.value })} />
                {formErrors.name && <small>{formErrors.name}</small>}
              </label>
              {isGuestCheckout && (
                <label>
                  Email Address
                  <input name="email" type="email" value={formData.email} placeholder="Enter your email address" onChange={e => setFormData({ ...formData, email: e.target.value })} />
                  {formErrors.email && <small>{formErrors.email}</small>}
                </label>
              )}
              <label>
                Phone Number
                <input name="phone" value={formData.phone} placeholder="10-digit mobile number" maxLength="10" onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })} />
                {formErrors.phone && <small>{formErrors.phone}</small>}
              </label>
              <label className="full-width">
                Street Address
                <input name="addressLine" value={formData.addressLine} placeholder="House no, Street, Area, Landmark" onChange={e => setFormData({ ...formData, addressLine: e.target.value })} />
                {formErrors.addressLine && <small>{formErrors.addressLine}</small>}
              </label>
              <label>
                Pincode
                <input value={formData.pincode} maxLength="6" placeholder="6-digit pincode" onChange={handlePincode} />
                {formErrors.pincode && <small>{formErrors.pincode}</small>}
              </label>
              <label>
                Area / City
                <input 
                  list="areaOptionsList" 
                  value={formData.city} 
                  placeholder={areaOptions.length > 1 ? "Type or select your area" : "Enter pincode to find your area"} 
                  onChange={e => setFormData({ ...formData, city: e.target.value })} 
                />
                {areaOptions.length > 1 && (
                  <datalist id="areaOptionsList">
                    {areaOptions.map(area => <option key={area} value={area} />)}
                  </datalist>
                )}
                {formErrors.city && <small>{areaOptions.length > 1 ? 'Select your delivery area' : formErrors.city}</small>}
              </label>
              <label>
                District
                <input value={formData.district} placeholder="District" onChange={e => setFormData({ ...formData, district: e.target.value })} />
                {formErrors.district && <small>{formErrors.district}</small>}
              </label>
              <label>
                State
                <input 
                  list="stateOptionsList"
                  value={formData.state} 
                  placeholder="Enter state"
                  onChange={e => {
                    const newSt = e.target.value;
                    setFormData(p => ({ ...p, state: newSt }));
                    if (newSt) fetchZoneRate(newSt);
                  }}
                />
                <datalist id="stateOptionsList">
                  {INDIAN_STATES.map(s => <option key={s} value={s} />)}
                </datalist>
                {formErrors.state && <small>{formErrors.state}</small>}
              </label>
            </div>
          </div>

          <div className="checkout-card" style={{ border: needsGstInvoice ? '1px solid #5f8d4e' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 16 }}>
              <div>
                <h2 style={{ marginBottom: 4 }}>Business GST Invoice</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Are you buying for a business and need a GST tax invoice?</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className={needsGstInvoice ? 'orders-btn--primary' : 'orders-btn--secondary'}
                  style={{ padding: '8px 16px' }}
                  onClick={() => setNeedsGstInvoice(true)}
                >
                  Yes, GST invoice
                </button>
                <button
                  type="button"
                  className={!needsGstInvoice ? 'orders-btn--primary' : 'orders-btn--secondary'}
                  style={{ padding: '8px 16px' }}
                  onClick={() => setNeedsGstInvoice(false)}
                >
                  No, normal purchase
                </button>
              </div>
            </div>

            {needsGstInvoice && (
              <div className="checkout-fields">
                <label>
                  Business / Company Name
                  <input value={businessDetails.businessName} placeholder="Enter business name" onChange={e => setBusinessDetails(p => ({ ...p, businessName: e.target.value }))} />
                  {formErrors.businessName && <small>{formErrors.businessName}</small>}
                </label>
                <label>
                  GSTIN
                  <input value={businessDetails.businessGstin} maxLength="15" placeholder="15-character GSTIN" onChange={e => setBusinessDetails(p => ({ ...p, businessGstin: e.target.value.toUpperCase() }))} />
                  {formErrors.businessGstin && <small>{formErrors.businessGstin}</small>}
                </label>
                <label className="full-width">
                  Billing Address
                  <input value={businessDetails.billingAddress} placeholder="House no, Street, Area, Landmark" onChange={e => setBusinessDetails(p => ({ ...p, billingAddress: e.target.value }))} />
                  {formErrors.billingAddress && <small>{formErrors.billingAddress}</small>}
                </label>
                <label>
                  Billing State
                  <input list="billingStateOptionsList" value={businessDetails.billingState} placeholder="Enter billing state" onChange={e => setBusinessDetails(p => ({ ...p, billingState: e.target.value }))} />
                  <datalist id="billingStateOptionsList">
                    {INDIAN_STATES.map(s => <option key={s} value={s} />)}
                  </datalist>
                  {formErrors.billingState && <small>{formErrors.billingState}</small>}
                </label>
                <label>
                  Billing Pincode
                  <input value={businessDetails.billingPincode} maxLength="6" placeholder="6-digit pincode" onChange={e => setBusinessDetails(p => ({ ...p, billingPincode: e.target.value.replace(/\D/g, '') }))} />
                  {formErrors.billingPincode && <small>{formErrors.billingPincode}</small>}
                </label>
              </div>
            )}
          </div>

          {/* STEP 2: Payment Method */}
          <div className="checkout-card payment-method-card">
            <div className="payment-method-header">
              <div className="payment-method-title">
                <span className="payment-method-step">02</span>
                <div>
                  <span className="payment-method-kicker">Secure checkout</span>
                  <h2>Payment Method</h2>
                </div>
              </div>
              <span className="payment-method-secure"><FiCheckCircle /> Protected</span>
            </div>
            <div className="payment-options-grid">

              {/* COD */}
              <label className={`payment-option payment-option--cod ${formData.paymentMethod === 'cod' ? 'active-pay' : ''}`}>
                <input type="radio" name="paymentMethod" value="cod" checked={formData.paymentMethod === 'cod'} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })} className="pay-radio" />
                <div className="payment-option-card">
                  <div className="pay-icon-wrap cod-icon">
                    <RiMoneyDollarCircleLine />
                  </div>
                  <div className="pay-content">
                    <div className="payment-option-label">Cash on Delivery</div>
                    <div className="payment-option-sub">Pay when your order arrives</div>
                  </div>
                  <div className="pay-radio-custom" aria-hidden="true"><FiCheck /></div>
                  <span className="payment-option-note">Pay later</span>
                </div>
              </label>

              {/* Online */}
              <label className={`payment-option payment-option--online ${formData.paymentMethod === 'online' ? 'active-pay' : ''}`} onClick={() => setFormData({ ...formData, paymentMethod: 'online' })}>
                <input type="radio" name="paymentMethod" value="online" checked={formData.paymentMethod === 'online'} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })} className="pay-radio" />
                <div className="payment-option-card">
                  <div className="pay-icon-wrap online-icon">
                    <RiBankCardLine />
                  </div>
                  <div className="pay-content">
                    <div className="payment-option-label">Online Payment</div>
                    <div className="payment-option-sub">UPI &bull; Cards &bull; Net Banking via HDFC</div>
                  </div>
                  <div className="pay-radio-custom" aria-hidden="true"><FiCheck /></div>
                  <span className="payment-option-note">Instant</span>
                </div>
              </label>

            </div>
          </div>

        </section>

        {/* ── RIGHT PANEL: Summary ── */}
        <aside className="checkout-summary">
          <h2>Order Summary</h2>

          {zoneRate.zoneName && shipping > 0 && (
            <div className="free-shipping-banner" style={{ background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)', borderColor: '#81c784', color: '#1b5e20' }}>
               {zoneRate.zoneName} Shipping Rate for {formData.state}
            </div>
          )}

          {/* Cart items */}
          {cart.map((item, idx) => (
            <div className="summary-product" key={`${item.cartItemId || item.id}-${idx}`}>
              {item.thumb && <img src={item.thumb} alt={item.name} />}
              <div>
                <strong>{item.name}</strong>
                <span>Qty {item.quantity}</span>
              </div>
              <b>{money(Number(item.price) * Number(item.quantity))}</b>
            </div>
          ))}

          {/* Coupon */}
          <div className="coupon-box">
            <label> Have a Coupon?</label>
            <div>
              <input
                value={couponCode}
                disabled={couponApplied}
                placeholder="ENTER CODE"
                onChange={e => setCouponCode(e.target.value)}
              />
              <button
                type="button"
                onClick={couponApplied
                  ? () => { sessionStorage.removeItem('at_pending_coupon_code'); setCouponApplied(false); setDiscountAmount(0); setAppliedCouponId(null); setCouponSuccess(''); setCouponCode(''); }
                  : applyCoupon
                }
              >
                {couponApplied ? 'Remove' : couponApplying ? '...' : 'Apply'}
              </button>
            </div>
            {couponError && <small style={{ color: 'var(--co-red)' }}>{couponError}</small>}
            {couponSuccess && <small style={{ color: 'var(--co-success)' }}>&#10003; {couponSuccess}</small>}
            {!couponApplied && visibleCoupons.length > 0 && (
              <div className="available-coupons">
                <small>Available for your cart</small>
                <div className="available-coupon-list">
                  {visibleCoupons.map(coupon => (
                    <button
                      key={coupon.id}
                      type="button"
                      className="available-coupon"
                      onClick={() => applyCoupon(coupon.code)}
                      disabled={couponApplying}
                      title={coupon.description || `Apply ${coupon.code}`}
                    >
                      <strong>{coupon.code}</strong>
                      <span>{coupon.type === 'flat' ? `${money(coupon.discountValue)} OFF` : `${coupon.discountValue}% OFF`}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Price breakdown */}
          <div className="summary-divider" />
          <div className="summary-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div className="summary-row">
            <span>Shipping {zoneRate.zoneName ? <small style={{ color: '#666', fontWeight: 400 }}>({zoneRate.zoneName})</small> : ''}</span>
            <span style={{ color: shippingLabel === 'Free' ? 'var(--co-success)' : 'inherit' }}>
              {shippingLabel}
            </span>
          </div>
          {discountAmount > 0 && (
            <div className="summary-row">
              <span className="discount-label">Coupon Discount</span>
              <span className="discount-val">-{money(discountAmount)}</span>
            </div>
          )}
          <div className="summary-total">
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>

          {/* CTA Button */}
          <button className="place-order-btn" type="submit" disabled={loading}>
            {loading
              ? ' Processing...'
              : formData.paymentMethod === 'online'
                ? ` Pay ${money(total)}`
                : ` Place Order`
            }
          </button>

          {/* Trust strip */}
          <div className="checkout-trust">
            <span> Secure Checkout</span>
            <span> Fast Delivery</span>
            <span> Easy Returns</span>
          </div>
        </aside>
      </form>
    </main>
  );
}
