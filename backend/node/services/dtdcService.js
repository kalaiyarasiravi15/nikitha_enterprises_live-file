const axios = require('axios');

const getBaseUrl = () => process.env.DTDC_API_URL || 'https://alphademodashboardapi.shipsy.io/api/customer/integration/consignment';
const getApiKey = () => process.env.DTDC_API_KEY;

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

const normalizeTrackingEvent = (event, index = 0) => {
    const rawTime = event?.event_time || event?.scanDateTime || event?.dateTime || event?.time || event?.timestamp || event?.created_at;
    let formattedTime = null;
    if (rawTime) {
        if (typeof rawTime === 'number') {
            formattedTime = new Date(rawTime).toISOString();
        } else {
            formattedTime = String(rawTime);
        }
    }

    return {
        index,
        status: event?.customer_update || event?.scanStatus || event?.status || event?.activity || event?.type || event?.description || event?.message || 'Update',
        location: event?.hub_name || event?.scanLocation || event?.location || event?.hub || event?.city || '',
        dateTime: formattedTime,
        raw: event
    };
};

const extractLabelValue = (payload) => {
    if (!payload) return null;

    if (Buffer.isBuffer(payload)) return payload;
    if (typeof payload === 'string') return payload;

    const candidates = [
        payload.label,
        payload.label_url,
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
        payload.data?.events,
        payload.events,
        payload.raw?.events,
        payload.trackingDetails,
        payload.tracking_details,
        payload.data?.trackingDetails,
        payload.data?.tracking_details,
        payload.data?.tracking_data?.trackingDetails,
        payload.data?.tracking_data?.tracking_details,
        payload.data?.[0]?.trackingDetails,
    ];

    const found = candidates.find(Array.isArray);
    return Array.isArray(found) ? found.map((event, index) => normalizeTrackingEvent(event, index)) : [];
};

const extractTrackingSummary = (payload, awbNumber) => {
    const source = payload?.data || payload?.result || payload || {};
    const events = extractTrackingEvents(payload);
    return {
        courier: 'DTDC',
        currentStatus: source.orderStatus || source.status || source.currentStatus || payload?.status || null,
        currentStatusCode: source.orderStatusCode || source.statusCode || null,
        trackingNumber: source.trackingNumber || source.reference_number || source.referenceNumber || awbNumber,
        expectedDeliveryDate: source.expectedDeliveryDate || null,
        carrierName: source.carrierName || 'DTDC',
        events,
        raw: payload
    };
};

const createOrder = async (order, packageDetails, shippingAddress, items) => {
    const itemSummary = Array.isArray(items) && items.length > 0
        ? items.map(i => `${i.productName || 'Product'}${i.variantLabel ? ` (${i.variantLabel})` : ''} x${i.quantity || 1}`).join(', ')
        : `Order ${order.orderId}`;
    const productDescription = itemSummary.substring(0, 120);

    const payload = {
        consignments: [
            {
                customer_code: process.env.DTDC_CUSTOMER_CODE || 'BL13586',
                service_type_id: process.env.DTDC_SERVICE_TYPE || "B2C SMART EXPRESS",
                load_type: "NON-DOCUMENT",
                description: productDescription,
                commodity_name: productDescription,
                content_description: productDescription,
                dimension_unit: "cm",
                length: String(packageDetails.length || 10),
                width: String(packageDetails.width || 10),
                height: String(packageDetails.height || 10),
                weight_unit: "kg",
                weight: String(packageDetails.weight || 1),
                declared_value: String(order.totalAmount),
                num_pieces: "1",
                origin_details: {
                    name: process.env.DTDC_ORIGIN_NAME || "NIKITHA ENTERPRISES",
                    phone: process.env.DTDC_ORIGIN_PHONE || "9620439696",
                    address_line_1: process.env.DTDC_ORIGIN_ADDRESS_LINE_1 || "NO 11,1st main road, ATR layout",
                    pincode: process.env.DTDC_ORIGIN_PINCODE || "560017",
                    city: process.env.DTDC_ORIGIN_CITY || "Bangalore",
                    state: process.env.DTDC_ORIGIN_STATE || "Karnataka"
                },
                destination_details: {
                    name: shippingAddress.name || "Customer",
                    phone: shippingAddress.phone || "0000000000",
                    address_line_1: shippingAddress.addressLine || "Destination Address",
                    pincode: shippingAddress.pincode || "000000",
                    city: shippingAddress.city || "City",
                    state: shippingAddress.state || "State"
                },
                customer_reference_number: order.orderId,
                cod_collection_mode: order.paymentMethod === 'Online' ? "" : "CASH",
                cod_amount: order.paymentMethod === 'Online' ? "" : String(order.totalAmount),
                commodity_id: "99",
                is_risk_surcharge_applicable: false
            }
        ]
    };

    try {
        if (!process.env.DTDC_API_KEY || process.env.TEST_MODE === 'true') {
            return `MOCK_DTDC_AWB_${order.orderId}`;
        }

        const response = await axios.post(`${getBaseUrl()}/softdata`, payload, {
            headers: {
                'api-key': getApiKey(),
                'Content-Type': 'application/json'
            }
        });

        if (response.data?.status === 'OK' && response.data.data?.[0]?.success) {
            return response.data.data[0].reference_number; // This is the AWB
        } else {
            console.error('DTDC Create Order Failed in response:', response.data);
            throw new Error('Failed to create order on DTDC: ' + JSON.stringify(response.data));
        }
    } catch (error) {
        console.error('DTDC Create Order Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to create order on DTDC');
    }
};

const getLabel = async (awbNumber) => {
    try {
        if (!process.env.DTDC_API_KEY || process.env.TEST_MODE === 'true') {
            return `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`;
        }

        const response = await axios.get(`${getBaseUrl()}/shippinglabel/stream`, {
            params: {
                reference_number: awbNumber,
                label_code: 'SHIP_LABEL_4X6',
                label_format: 'base64'
            },
            headers: {
                'api-key': getApiKey()
            }
        });

        const labelValue = extractLabelValue(response.data);
        if (!labelValue) {
            throw new Error(`DTDC label response did not include a label payload: ${JSON.stringify(response.data)}`);
        }

        return toPdfDataUrl(labelValue);
    } catch (error) {
        const dtdcMessage = error.response?.data?.message
            || error.response?.data?.error
            || (typeof error.response?.data === 'string' ? error.response.data : null)
            || error.message;
        console.error('DTDC Generate Label Error:', dtdcMessage);
        throw new Error(`Failed to fetch shipping label from DTDC: ${dtdcMessage}`);
    }
};

const getTracking = async (awbNumber) => {
    try {
        if (!process.env.DTDC_API_KEY || process.env.TEST_MODE === 'true') {
            return {
                courier: 'DTDC',
                currentStatus: 'Mock tracking',
                trackingNumber: awbNumber,
                events: [
                    { index: 0, status: 'Shipment booked', location: 'Mock warehouse', dateTime: new Date().toISOString(), raw: { mock: true } }
                ],
                raw: { mock: true }
            };
        }

        const response = await axios.get(`${getBaseUrl()}/track`, {
            params: {
                reference_number: awbNumber
            },
            headers: {
                'api-key': getApiKey()
            }
        });

        return extractTrackingSummary(response.data, awbNumber);
    } catch (error) {
        const dtdcMessage = error.response?.data?.message
            || error.response?.data?.error
            || (typeof error.response?.data === 'string' ? error.response.data : null)
            || error.message;
        console.error('DTDC Tracking Error:', dtdcMessage);
        throw new Error(`Failed to fetch tracking from DTDC: ${dtdcMessage}`);
    }
};

const cancelOrder = async (awbNumber) => {
    try {
        if (!process.env.DTDC_API_KEY || process.env.TEST_MODE === 'true') {
            return { success: true };
        }

        const response = await axios.post(`${getBaseUrl()}/cancel`, {
            AWBNo: [awbNumber],
            customerCode: process.env.DTDC_CUSTOMER_CODE || 'TEST_CUSTOMER_CODE'
        }, {
            headers: {
                'api-key': getApiKey(),
                'Content-Type': 'application/json'
            }
        });

        if (response.data?.status === 'OK' && response.data?.successConsignments?.[0]?.success) {
            return response.data;
        } else {
            console.error('DTDC Cancel Order Failed in response:', response.data);
            throw new Error('Failed to cancel order on DTDC');
        }
    } catch (error) {
        console.error('DTDC Cancel Order Error:', error.response?.data || error.message);
        throw new Error('Failed to cancel order on DTDC');
    }
};

module.exports = {
    createOrder,
    getLabel,
    getTracking,
    cancelOrder
};
