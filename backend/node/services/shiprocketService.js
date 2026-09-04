const axios = require('axios');

const getBaseUrl = () => process.env.SHIPROCKET_API_URL || 'https://apiv2.shiprocket.in/v1/external';
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;
let cachedToken = null;
let cachedTokenAt = 0;

const getCredentials = () => ({
    email: process.env.SHIPROCKET_API_USER_EMAIL || process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_API_USER_PASSWORD || process.env.SHIPROCKET_PASSWORD
});

const toPdfDataUrl = (value) => {
    if (!value) return null;

    if (Buffer.isBuffer(value)) {
        return `data:application/pdf;base64,${value.toString('base64')}`;
    }

    const raw = String(value).trim().replace(/^"+|"+$/g, '');
    if (!raw) return null;
    if (raw.startsWith('data:application/pdf')) return raw;
    if (raw.startsWith('data:')) return raw;
    if (/^https?:\/\//i.test(raw)) return raw;
    return `data:application/pdf;base64,${raw}`;
};

const normalizeTrackingEvent = (event, index = 0) => ({
    index,
    status: event?.scanStatus || event?.status || event?.activity || event?.description || event?.checkpoint || event?.message || 'Update',
    location: event?.scanLocation || event?.location || event?.city || event?.hub || '',
    dateTime: event?.scanDateTime || event?.dateTime || event?.time || event?.timestamp || event?.created_at || null,
    raw: event
});

const extractLabelValue = (payload) => {
    if (!payload) return null;

    if (Buffer.isBuffer(payload)) {
        return payload;
    }

    if (typeof payload === 'string') {
        return payload;
    }

    const candidates = [
        payload.label,
        payload.label_url,
        payload.labelUrl,
        payload.pdf,
        payload.pdf_url,
        payload.base64,
        payload.data,
        payload.result,
        payload.response?.label,
        payload.response?.label_url,
        payload.response?.data,
        payload.data?.label,
        payload.data?.label_url,
        payload.data?.pdf,
        payload.data?.pdf_url,
        payload.data?.base64,
        payload.data?.data,
        payload.data?.result,
        payload.data?.[0]?.label,
        payload.data?.[0]?.label_url,
        payload.data?.[0]?.pdf,
    ];

    for (const candidate of candidates) {
        if (candidate == null) continue;
        if (Buffer.isBuffer(candidate)) return candidate;
        if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }

    return null;
};

const extractTrackingEvents = (payload) => {
    if (!payload) return [];

    const candidates = [
        payload.trackingDetails,
        payload.tracking_details,
        payload.shipment_track_activities,
        payload.tracking_data?.shipment_track?.[0]?.scan_history,
        payload.data?.trackingDetails,
        payload.data?.tracking_details,
        payload.data?.shipment_track_activities,
        payload.data?.tracking_data?.shipment_track?.[0]?.scan_history,
        payload.tracking_data?.shipment_track_activities,
        payload.data?.tracking_data?.shipment_track_activities,
        payload.shipment_track_activities?.[0]?.history,
        payload.data?.shipment_track?.[0]?.scan_history,
        payload.data?.[0]?.trackingDetails,
    ];

    const found = candidates.find(Array.isArray);
    return Array.isArray(found) ? found.map((event, index) => normalizeTrackingEvent(event, index)) : [];
};

const extractTrackingSummary = (payload) => {
    const source = payload?.data || payload?.tracking_data || payload?.shipment_track?.[0] || payload?.shipment_track || payload || {};
    const events = extractTrackingEvents(payload);
    return {
        courier: 'Shiprocket',
        currentStatus: source.current_status || source.status || source.shipment_status || payload?.shipment_status || payload?.status || null,
        currentStatusCode: source.status_code || source.shipment_status || payload?.status_code || null,
        trackingNumber: source.awb_code || source.awb || source.tracking_number || source.shipment_awb || payload?.awb_code || null,
        shipmentId: source.shipment_id || payload?.shipment_id || null,
        orderId: source.order_id || payload?.order_id || null,
        expectedDeliveryDate: source.etd || source.expected_delivery_date || payload?.expected_delivery_date || null,
        carrierName: source.courier_name || source.courier_company || payload?.courier_name || 'Shiprocket',
        events,
        raw: payload
    };
};

const login = async (forceRefresh = false) => {
    const manualToken = process.env.SHIPROCKET_TOKEN;
    if (manualToken) return manualToken;

    if (!forceRefresh && cachedToken && (Date.now() - cachedTokenAt) < TOKEN_TTL_MS) {
        return cachedToken;
    }

    const { email, password } = getCredentials();
    if (!email || !password) return 'MOCK_TOKEN';

    try {
        const response = await axios.post(`${getBaseUrl()}/auth/login`, {
            email,
            password
        });
        const token = response.data?.token || response.data?.data?.token;
        if (!token) {
            throw new Error('Shiprocket did not return an auth token');
        }
        cachedToken = token;
        cachedTokenAt = Date.now();
        return token;
    } catch (error) {
        const shiprocketMessage = error.response?.data?.message
            || error.response?.data?.error
            || (typeof error.response?.data === 'string' ? error.response.data : null)
            || error.message;
        console.error('Shiprocket Login Error:', shiprocketMessage);
        throw new Error(`Failed to authenticate with Shiprocket: ${shiprocketMessage}`);
    }
};

const createOrder = async (order, packageDetails, shippingAddress, items) => {
    const token = await login();
    const { email } = getCredentials();
    
    // Format order payload
    const payload = {
        order_id: order.orderId,
        order_date: new Date(order.createdAt).toISOString().split('T')[0],
        pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
        billing_customer_name: shippingAddress.name,
        billing_last_name: "",
        billing_address: shippingAddress.addressLine,
        billing_city: shippingAddress.city,
        billing_pincode: shippingAddress.pincode,
        billing_state: shippingAddress.state,
        billing_country: "India",
        billing_email: order.Customer?.email || "customer@example.com",
        billing_phone: shippingAddress.phone,
        shipping_is_billing: true,
        order_items: items.map(item => ({
            name: item.productName || 'Product',
            sku: `SKU-${item.productId}`,
            units: item.quantity,
            selling_price: item.salesPrice,
            discount: 0
        })),
        payment_method: order.paymentMethod === 'Online' ? 'Prepaid' : 'COD',
        sub_total: order.totalAmount,
        length: packageDetails.length,
        breadth: packageDetails.width,
        height: packageDetails.height,
        weight: packageDetails.weight
    };

    try {
        if (!email) {
            return { order_id: `MOCK_SR_ORD_${order.orderId}`, shipment_id: `MOCK_SR_SHIP_${order.orderId}` };
        }
        
        const response = await axios.post(`${getBaseUrl()}/orders/create/adhoc`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.data || !response.data.order_id) {
            throw new Error(response.data?.message || 'Failed to create order on Shiprocket. Please check your pickup location and details.');
        }
        
        return response.data; // contains order_id, shipment_id
    } catch (error) {
        if (error.response?.status === 401) {
            const refreshedToken = await login(true);
            const retryResponse = await axios.post(`${getBaseUrl()}/orders/create/adhoc`, payload, {
                headers: { Authorization: `Bearer ${refreshedToken}` }
            });
            return retryResponse.data;
        }
        console.error('Shiprocket Create Order Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to create order on Shiprocket');
    }
};

const generateAWB = async (shipmentId) => {
    const token = await login();
    const { email } = getCredentials();
    try {
        if (!email) {
            return { response: { data: { awb_code: `AWB_${Math.floor(Math.random() * 1000000)}` } } };
        }
        
        const response = await axios.post(`${getBaseUrl()}/courier/assign/awb`, {
            shipment_id: shipmentId
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        if (error.response?.status === 401) {
            const refreshedToken = await login(true);
            const retryResponse = await axios.post(`${getBaseUrl()}/courier/assign/awb`, {
                shipment_id: shipmentId
            }, {
                headers: { Authorization: `Bearer ${refreshedToken}` }
            });
            return retryResponse.data;
        }
        const shiprocketMessage = error.response?.data?.message
            || error.response?.data?.error
            || (typeof error.response?.data === 'string' ? error.response.data : null)
            || error.message;
        console.error('Shiprocket Generate AWB Error:', shiprocketMessage);
        throw new Error(`Failed to generate AWB on Shiprocket: ${shiprocketMessage}`);
    }
};

const getLabel = async (shipmentId) => {
    const token = await login();
    const { email } = getCredentials();
    try {
        if (!email) {
            return `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`;
        }

        const response = await axios.post(`${getBaseUrl()}/courier/generate/label`, {
            shipment_id: [shipmentId]
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const labelValue = extractLabelValue(response.data);
        if (!labelValue) {
            throw new Error(`Shiprocket label response did not include a label URL or PDF payload: ${JSON.stringify(response.data)}`);
        }

        return toPdfDataUrl(labelValue);
    } catch (error) {
        if (error.response?.status === 401) {
            const refreshedToken = await login(true);
            const retryResponse = await axios.post(`${getBaseUrl()}/courier/generate/label`, {
                shipment_id: [shipmentId]
            }, {
                headers: { Authorization: `Bearer ${refreshedToken}` }
            });
            const labelValue = extractLabelValue(retryResponse.data);
            if (!labelValue) {
                throw new Error(`Shiprocket label response did not include a label URL or PDF payload: ${JSON.stringify(retryResponse.data)}`);
            }
            return toPdfDataUrl(labelValue);
        }
        const shiprocketMessage = error.response?.data?.message
            || error.response?.data?.error
            || (typeof error.response?.data === 'string' ? error.response.data : null)
            || error.message;
        console.error('Shiprocket Generate Label Error:', shiprocketMessage);
        throw new Error(`Failed to generate label on Shiprocket: ${shiprocketMessage}`);
    }
};

const getTracking = async (awbCode) => {
    const token = await login();
    const { email } = getCredentials();
    try {
        if (!email) {
            return {
                courier: 'Shiprocket',
                currentStatus: 'Mock tracking',
                trackingNumber: awbCode,
                events: [
                    { index: 0, status: 'Shipment booked', location: 'Mock warehouse', dateTime: new Date().toISOString(), raw: { mock: true } }
                ],
                raw: { mock: true }
            };
        }

        const response = await axios.get(`${getBaseUrl()}/courier/track/awb/${awbCode}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        return extractTrackingSummary(response.data);
    } catch (error) {
        if (error.response?.status === 401) {
            const refreshedToken = await login(true);
            const retryResponse = await axios.get(`${getBaseUrl()}/courier/track/awb/${awbCode}`, {
                headers: { Authorization: `Bearer ${refreshedToken}` }
            });
            return extractTrackingSummary(retryResponse.data);
        }

        const shiprocketMessage = error.response?.data?.message
            || error.response?.data?.error
            || (typeof error.response?.data === 'string' ? error.response.data : null)
            || error.message;
        console.error('Shiprocket Tracking Error:', shiprocketMessage);
        throw new Error(`Failed to fetch tracking from Shiprocket: ${shiprocketMessage}`);
    }
};

const cancelOrder = async (shiprocketOrderId) => {
    const token = await login();
    const { email } = getCredentials();
    try {
        if (!email) {
            return { success: true };
        }

        const response = await axios.post(`${getBaseUrl()}/orders/cancel`, {
            ids: [shiprocketOrderId]
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        if (error.response?.status === 401) {
            const refreshedToken = await login(true);
            const retryResponse = await axios.post(`${getBaseUrl()}/orders/cancel`, {
                ids: [shiprocketOrderId]
            }, {
                headers: { Authorization: `Bearer ${refreshedToken}` }
            });
            return retryResponse.data;
        }
        console.warn('Shiprocket Cancel Order Error (Mocking instead):', error.response?.data || error.message);
        return { success: true };
    }
};

module.exports = {
    createOrder,
    generateAWB,
    getLabel,
    getTracking,
    cancelOrder
};
