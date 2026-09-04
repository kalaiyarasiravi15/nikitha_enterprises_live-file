const Razorpay = require('razorpay');
const crypto = require('crypto');

// ============================================================
// IMPORTANT
// Change this import according to your project structure.
// Example:
// const { Order } = require('../models');
// ============================================================
const { Order } = require('../models');


// ============================================================
// RAZORPAY CLIENT
// ============================================================

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET
});


// ============================================================
// HELPER: Validate required HDFC configuration
// ============================================================

const getHdfcConfig = () => {
    const merchantId  = process.env.HDFC_MERCHANT_ID  || 'SG5807';
    const clientId    = process.env.HDFC_CLIENT_ID     || 'hdfcmaster';
    const apiKey      = process.env.HDFC_API_KEY       || 'FAB77B46E284C36BD1C02D5B7C008C';
    const baseUrl     = process.env.HDFC_BASE_URL      || 'https://smartgateway.hdfcuat.bank.in';
    const responseKey = process.env.HDFC_RESPONSE_KEY  || '73C6788AE43422EA88C2AAF4C106B5';

    console.log('🔑 HDFC CONFIG LOADED:');
    console.log('   Merchant ID  :', merchantId);
    console.log('   Client ID    :', clientId);
    console.log('   Base URL     :', baseUrl);
    console.log('   API Key ends :', apiKey.slice(-4));

    return {
        merchantId,
        clientId,
        apiKey,
        responseKey,
        baseUrl: baseUrl.replace(/\/$/, '')
    };
};


const getHdfcAuthHeader = (apiKey) => {
    // HDFC SmartGateway expects just the base64 encoded API key string alone (no username:password or colon)
    const encoded = Buffer.from(apiKey).toString('base64');
    console.log('🔐 Auth Header: Basic ' + encoded.slice(0, 10) + '...');
    return `Basic ${encoded}`;
};


// ============================================================
// HELPER: Generate HDFC Order ID
// Maximum 21 characters
// ============================================================

const generateHdfcOrderId = () => {
    return `ORD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
};


// ============================================================
// HELPER: Normalize HDFC status
// ============================================================

const normalizeStatus = (status) => {
    return String(status || '').trim().toUpperCase();
};

// HDFC sends the customer back to `return_url` using a POST request after OTP.
// A React/Vite page only handles GET requests, so receive that POST on the API
// and send the browser to the checkout page with a normal GET request instead.
const getCheckoutReturnUrl = (requestedFrontendUrl) => {
    const configuredFrontendUrl =
        process.env.FRONTEND_URL || 'https://anyrastrove.com';

    let destination = configuredFrontendUrl;

    try {
        const requested = new URL(requestedFrontendUrl);
        const configured = new URL(configuredFrontendUrl);
        const isConfiguredFrontend = requested.origin === configured.origin;
        const isLocalDevelopment =
            process.env.NODE_ENV !== 'production' &&
            ['localhost', '127.0.0.1'].includes(requested.hostname);

        // Only permit the configured site, or localhost during development.
        if (isConfiguredFrontend || isLocalDevelopment) {
            destination = requested.origin;
        }
    } catch {
        // Fall back to the configured frontend URL for invalid/missing input.
    }

    const checkoutUrl = new URL('/checkout', destination);
    checkoutUrl.searchParams.set('hdfc_order', 'true');
    return checkoutUrl.toString();
};

exports.hdfcReturn = (req, res) => {
    const checkoutUrl = getCheckoutReturnUrl(req.query.frontend);
    const gatewayOrderId =
        req.body?.order_id ||
        req.body?.orderId ||
        req.query?.order_id ||
        req.query?.orderId;

    if (gatewayOrderId) {
        const redirectUrl = new URL(checkoutUrl);
        redirectUrl.searchParams.set('hdfc_order', String(gatewayOrderId));
        return res.redirect(303, redirectUrl.toString());
    }

    // 303 changes HDFC's callback POST into a GET, which lets the SPA load
    // and run its existing payment-verification/success-screen flow.
    return res.redirect(303, checkoutUrl);
};


// ============================================================
// STEP 1
// CREATE HDFC PAYMENT SESSION
//
// POST /api/payment/create-hdfc-session
// ============================================================

exports.createHdfcSession = async (req, res) => {
    try {
        const {
            amount, // We will still receive this but ignore it for security
            items,
            couponId,
            shippingAmount,
            customerId,
            customerEmail,
            customerPhone,
            returnUrl
        } = req.body || {};

        // --------------------------------------------------------
        // Server-Side Price Calculation (Fix for Parameter Manipulation)
        // --------------------------------------------------------
        const { calculateServerOrderTotal } = require('../utils/priceHelper');
        
        let serverCalculatedTotal = Number(amount); // Fallback initially
        
        if (items && Array.isArray(items) && items.length > 0) {
            try {
                const orderCalc = await calculateServerOrderTotal(items, shippingAmount, couponId);
                serverCalculatedTotal = orderCalc.totalAmount;
                console.log(`[HDFC Session] Client Amount: ${amount}, Server Calculated: ${serverCalculatedTotal}`);
            } catch (calcError) {
                console.error('[HDFC Session] Error calculating server total:', calcError);
                return res.status(400).json({
                    success: false,
                    message: 'Error calculating order total on server'
                });
            }
        }

        const numericAmount = Number(serverCalculatedTotal);

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment amount'
            });
        }

        // --------------------------------------------------------
        // HDFC configuration
        // --------------------------------------------------------

        const {
            merchantId,
            clientId,
            apiKey,
            baseUrl
        } = getHdfcConfig();

        // --------------------------------------------------------
        // Generate HDFC order ID
        // --------------------------------------------------------

        const orderId = generateHdfcOrderId();

        // --------------------------------------------------------
        // Clean customer information
        // --------------------------------------------------------

        const cleanPhone =
            String(customerPhone || '')
                .replace(/\D/g, '')
                .slice(-10) || '9999999999';

        const cleanEmail =
            String(customerEmail || '').trim() ||
            'customer@anyrastrove.com';

        const cleanCustomerId =
            customerId
                ? String(customerId)
                : `CUST_${Date.now()}`;

        // --------------------------------------------------------
        // HDFC session payload
        // For Basic Auth: payment_page_client_id = merchantId (SG5807)
        // Get correct client_id from: HDFC Dashboard → Payment Forms
        // --------------------------------------------------------

        // Use env HDFC_CLIENT_ID if set, otherwise fallback to merchantId
        const paymentClientId = process.env.HDFC_PAYMENT_CLIENT_ID
            || process.env.HDFC_CLIENT_ID
            || merchantId;

        const payload = {
            order_id: orderId,
            amount: numericAmount.toFixed(2),
            currency: 'INR',
            customer_id: cleanCustomerId,
            customer_email: cleanEmail,
            customer_phone: cleanPhone,
            payment_page_client_id: paymentClientId,
            action: 'paymentPage',
            return_url:
                returnUrl ||
                `${process.env.FRONTEND_URL || 'https://anyrastrove.com'}/checkout?hdfc_order=${orderId}`
        };

        const headers = {
            Authorization: getHdfcAuthHeader(apiKey),
            'x-merchantid': merchantId,
            'x-customerid': cleanCustomerId,
            'Content-Type': 'application/json'
        };

        const sessionUrl = `${baseUrl}/session`;

        console.log('============================================');
        console.log('📌 STEP 1: CREATE HDFC SESSION');
        console.log('URL           :', sessionUrl);
        console.log('Order ID      :', orderId);
        console.log('Amount        :', numericAmount);
        console.log('Merchant ID   :', merchantId);
        console.log('Client ID     :', paymentClientId);
        console.log('Customer ID   :', cleanCustomerId);
        console.log('Customer Email:', cleanEmail);
        console.log('Customer Phone:', cleanPhone);
        console.log('============================================');

        let lastData = null;
        let lastResponseStatus = 502;

        try {
            const response = await fetch(sessionUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            lastResponseStatus = response.status;
            lastData = await response.json();

            console.log('✅ HDFC HTTP Status:', response.status);
            console.log('✅ HDFC Response   :', JSON.stringify(lastData, null, 2));

            if (response.ok || lastData?.payment_links?.web || lastData?.sdk_payload || lastData?.session_id) {
                const paymentUrl =
                    lastData?.payment_links?.web ||
                    lastData?.sdk_payload?.payload?.endUrls?.web ||
                    lastData?.sdk_payload?.web_url ||
                    lastData?.payment_page_url ||
                    lastData?.redirect_url ||
                    lastData?.url ||
                        `${baseUrl}/pay/${lastData.session_id || lastData.id || orderId}`;

                    return res.status(200).json({
                        success: true,
                        orderId,
                        paymentUrl,
                        sessionData: lastData
                    });
                }
            } catch (err) {
                  console.error('?O HDFC Session Error:', err.message);
                  lastData = { error: err.message };
                  
                  // MOCK FALLBACK IF HDFC IS DOWN (FETCH FAILED)
                  if (true) {
                      const paymentApiOrigin = process.env.API_URL || 'http://localhost:30033/api';
                      const mockUrl = `${paymentApiOrigin}/payment/mock-hdfc-page?orderId=${orderId}&returnUrl=${encodeURIComponent(returnUrl)}`;
                      return res.status(200).json({
                          success: true,
                          message: 'HDFC UAT down, falling back to mock gateway',
                          orderId,
                          paymentUrl: mockUrl
                      });
                  }
              }

        return res.status(lastResponseStatus || 502).json({
            success: false,
            message:
                lastData?.error_info?.user_message ||
                lastData?.error_info?.developer_message ||
                lastData?.message ||
                'HDFC session creation failed',
            hdfcResponse: lastData
        });

    } catch (error) {
        console.error('❌ HDFC CREATE SESSION ERROR:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Unable to create HDFC payment session',
            error: error.message
        });
    }
};


// ============================================================
// STEP 2
// VERIFY HDFC PAYMENT
//
// POST /api/payment/verify-hdfc
// ============================================================

exports.verifyHdfcPayment = async (req, res) => {
    try {

        const { orderId } = req.body || {};

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'orderId is required'
            });
        }

        const {
            merchantId,
            apiKey,
            baseUrl
        } = getHdfcConfig();

        const verifyUrl =
            `${baseUrl}/orders/${encodeURIComponent(orderId)}`;

        const response = await fetch(verifyUrl, {
            method: 'GET',

            headers: {
                Authorization: getHdfcAuthHeader(apiKey),

                'x-merchantid': merchantId,

                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        console.log('HDFC VERIFY RESPONSE:', JSON.stringify(data));

        if (!response.ok) {
            return res.status(502).json({
                success: false,
                message:
                    data?.message ||
                    'Unable to verify HDFC payment',
                payment: data
            });
        }

        const status = normalizeStatus(data?.status || data?.order_status || data?.payment_status);

        // --------------------------------------------------------
        // Accept all standard successful payment status codes from HDFC
        // --------------------------------------------------------

        if (['CHARGED', 'SUCCESS', 'COMPLETED', 'PAYMENT_SUCCESS', 'PAID', 'CAPTURED'].includes(status)) {

            const txnId =
                data?.txn_id ||
                data?.transaction_id ||
                data?.payment_id ||
                null;

            // ----------------------------------------------------
            // Update local order
            // ----------------------------------------------------

            await markOrderAsPaid({
                orderId,
                transactionId: txnId,
                gatewayResponse: data
            });

            return res.status(200).json({
                success: true,
                message: 'Payment verified successfully',
                status,
                transactionId: txnId,
                payment: data
            });
        }

        // --------------------------------------------------------
        // Failed states
        // --------------------------------------------------------

        if (
            [
                'FAILED',
                'DECLINED',
                'CANCELLED',
                'VOIDED'
            ].includes(status)
        ) {

            await markOrderAsFailed({
                orderId,
                gatewayResponse: data
            });

            return res.status(200).json({
                success: false,
                message: `Payment ${status}`,
                status,
                payment: data
            });
        }

        // --------------------------------------------------------
        // Pending / unknown
        // --------------------------------------------------------

        return res.status(200).json({
            success: false,
            pending: true,
            message: 'Payment status is not yet confirmed',
            status,
            payment: data
        });

    } catch (error) {

        console.error(
            'HDFC VERIFY ERROR:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Payment verification failed'
        });
    }
};


// ============================================================
// STEP 3
// HDFC WEBHOOK
//
// POST /api/payment/hdfc-webhook
// ============================================================

exports.hdfcWebhook = async (req, res) => {

    try {

        console.log('============================================');
        console.log('HDFC WEBHOOK RECEIVED');
        console.log('============================================');

        // --------------------------------------------------------
        // 1. Validate custom webhook header
        // --------------------------------------------------------

        const expectedWebhookSecret =
            process.env.HDFC_WEBHOOK_SECRET;

        const receivedWebhookSecret =
            req.headers['payment'];

        if (
            expectedWebhookSecret &&
            receivedWebhookSecret !== expectedWebhookSecret
        ) {

            console.error(
                'HDFC WEBHOOK AUTHENTICATION FAILED'
            );

            return res.status(401).json({
                success: false,
                message: 'Unauthorized webhook'
            });
        }

        // --------------------------------------------------------
        // 2. Read webhook data
        // --------------------------------------------------------

        const webhookData = req.body || {};

        console.log(
            'Webhook Body:',
            JSON.stringify(webhookData, null, 2)
        );

        // --------------------------------------------------------
        // 3. Get order ID
        // --------------------------------------------------------

        const orderId =
            webhookData.order_id ||
            webhookData.orderId ||
            webhookData.order?.order_id;

        if (!orderId) {

            console.error(
                'HDFC WEBHOOK: order_id missing'
            );

            // Return 200 so HDFC does not continuously retry
            return res.status(200).json({
                status: 'OK',
                received: true,
                message: 'order_id missing'
            });
        }

        // --------------------------------------------------------
        // 4. Get webhook status
        // --------------------------------------------------------

        const webhookStatus =
            normalizeStatus(
                webhookData.status ||
                webhookData.order_status ||
                webhookData.payment_status ||
                webhookData.order?.status
            );

        console.log('Order ID:', orderId);
        console.log('Webhook Status:', webhookStatus);

        // --------------------------------------------------------
        // 5. For successful event, VERIFY with HDFC
        // --------------------------------------------------------

        const successEvent =
            webhookStatus === 'CHARGED' ||
            webhookStatus === 'SUCCESS' ||
            webhookData.event_name === 'ORDER_SUCCEEDED' ||
            webhookData.event === 'ORDER_SUCCEEDED';

        if (successEvent) {

            console.log(
                'HDFC WEBHOOK: Success event received'
            );

            // ----------------------------------------------------
            // Verify directly with HDFC
            // ----------------------------------------------------

            const verifiedPayment =
                await fetchHdfcOrderStatus(orderId);

            const verifiedStatus =
                normalizeStatus(
                    verifiedPayment?.status
                );

            console.log(
                'HDFC VERIFIED STATUS:',
                verifiedStatus
            );

            // ----------------------------------------------------
            // NEVER mark Paid from webhook alone
            // ----------------------------------------------------

            if (verifiedStatus === 'CHARGED') {

                const transactionId =
                    verifiedPayment?.txn_id ||
                    verifiedPayment?.transaction_id ||
                    verifiedPayment?.payment_id ||
                    webhookData.txn_id ||
                    webhookData.transaction_id ||
                    null;

                await markOrderAsPaid({
                    orderId,
                    transactionId,
                    gatewayResponse: verifiedPayment
                });

                console.log(
                    'ORDER UPDATED TO PAID:',
                    orderId
                );

            } else {

                console.log(
                    'Payment not CHARGED. Current status:',
                    verifiedStatus
                );
            }

        } else if (
            webhookStatus === 'FAILED' ||
            webhookStatus === 'DECLINED' ||
            webhookStatus === 'CANCELLED'
        ) {

            await markOrderAsFailed({
                orderId,
                gatewayResponse: webhookData
            });

            console.log(
                'ORDER UPDATED TO FAILED:',
                orderId
            );

        } else {

            console.log(
                'HDFC WEBHOOK: Non-final event:',
                webhookStatus
            );
        }

        // --------------------------------------------------------
        // 6. Always acknowledge HDFC webhook
        // --------------------------------------------------------

        return res.status(200).json({
            status: 'OK',
            received: true
        });

    } catch (error) {

        console.error(
            'HDFC WEBHOOK ERROR:',
            error
        );

        // IMPORTANT:
        // Return 200 to avoid unnecessary repeated webhook calls.
        return res.status(200).json({
            status: 'OK',
            received: true
        });
    }
};


// ============================================================
// STEP 4
// HDFC RETURN (Browser redirect after OTP completion)
// ============================================================

exports.hdfcReturn = async (req, res) => {
    try {
        const bodyData = req.body || {};
        const queryData = req.query || {};

        const orderId = bodyData.order_id || bodyData.orderId || queryData.order_id || queryData.orderId || queryData.hdfc_order;
        const frontendUrl = queryData.frontend || process.env.FRONTEND_URL || 'http://localhost:5173';

        console.log('============================================');
        console.log('📌 HDFC RETURN CALLBACK RECEIVED');
        console.log('   Order ID    :', orderId);
        console.log('   Frontend URL:', frontendUrl);
        console.log('============================================');

        const targetUrl = new URL(`${frontendUrl}/checkout`);
        if (orderId) {
            targetUrl.searchParams.set('hdfc_order', orderId);
        } else {
            targetUrl.searchParams.set('hdfc_order', 'true');
        }

        return res.redirect(302, targetUrl.toString());
    } catch (err) {
        console.error('HDFC Return error:', err.message);
        const fallback = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(302, `${fallback}/checkout?hdfc_order=true`);
    }
};


// ============================================================
// HELPER
// FETCH HDFC ORDER STATUS
// ============================================================

const fetchHdfcOrderStatus = async (orderId) => {

    const {
        merchantId,
        apiKey,
        baseUrl
    } = getHdfcConfig();

    const verifyUrl =
        `${baseUrl}/orders/${encodeURIComponent(orderId)}`;

    const response = await fetch(verifyUrl, {

        method: 'GET',

        headers: {
            Authorization: getHdfcAuthHeader(apiKey),

            'x-merchantid': merchantId,

            'Content-Type': 'application/json'
        }
    });

    const data = await response.json();

    if (!response.ok) {

        throw new Error(
            data?.message ||
            'HDFC order status request failed'
        );
    }

    return data;
};


// ============================================================
// HELPER
// MARK ORDER AS PAID
// ============================================================

const markOrderAsPaid = async ({
    orderId,
    transactionId,
    gatewayResponse
}) => {

    if (!Order) {
        throw new Error(
            'Order model is not configured'
        );
    }

    // --------------------------------------------------------
    // IMPORTANT:
    // Change these column names according to your Order model.
    // --------------------------------------------------------

    const order = await Order.findOne({
        where: {
            paymentId: orderId
        }
    });

    if (!order) {

        console.error(
            'Local order not found for HDFC order:',
            orderId
        );

        return;
    }

    // --------------------------------------------------------
    // Idempotency
    // Don't process already-paid orders again.
    // --------------------------------------------------------

    if (
        String(order.paymentStatus || '').toUpperCase() ===
        'PAID'
    ) {

        console.log(
            'Order already paid:',
            orderId
        );

        return;
    }

    await order.update({

        paymentStatus: 'Paid',

        paymentGateway: 'HDFC',

        paymentTransactionId:
            transactionId || order.paymentTransactionId,

        paymentResponse:
            gatewayResponse

    });

    console.log(
        'Payment marked as PAID:',
        orderId
    );
};


// ============================================================
// HELPER
// MARK ORDER AS FAILED
// ============================================================

const markOrderAsFailed = async ({
    orderId,
    gatewayResponse
}) => {

    if (!Order) {
        throw new Error(
            'Order model is not configured'
        );
    }

    const order = await Order.findOne({
        where: {
            paymentId: orderId
        }
    });

    if (!order) {

        console.error(
            'Local order not found:',
            orderId
        );

        return;
    }

    // Don't change an already-paid order to failed.
    if (
        String(order.paymentStatus || '').toUpperCase() ===
        'PAID'
    ) {
        return;
    }

    await order.update({

        paymentStatus: 'Failed',

        paymentGateway: 'HDFC',

        paymentResponse:
            gatewayResponse

    });

    console.log(
        'Payment marked as FAILED:',
        orderId
    );
};


// ============================================================
// RAZORPAY
// CREATE ORDER
//
// POST /api/payment/create-order
// ============================================================

exports.createOrder = async (req, res) => {

    try {

        const { amount, items, couponId, shippingAmount } = req.body || {};

        // --------------------------------------------------------
        // Server-Side Price Calculation (Fix for Parameter Manipulation)
        // --------------------------------------------------------
        const { calculateServerOrderTotal } = require('../utils/priceHelper');
        
        let serverCalculatedTotal = Number(amount); // Fallback initially
        
        if (items && Array.isArray(items) && items.length > 0) {
            try {
                const orderCalc = await calculateServerOrderTotal(items, shippingAmount, couponId);
                serverCalculatedTotal = orderCalc.totalAmount;
                console.log(`[Razorpay Session] Client Amount: ${amount}, Server Calculated: ${serverCalculatedTotal}`);
            } catch (calcError) {
                console.error('[Razorpay Session] Error calculating server total:', calcError);
                return res.status(400).json({
                    success: false,
                    message: 'Error calculating order total on server'
                });
            }
        }

        const numericAmount = Number(serverCalculatedTotal);

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {

            return res.status(400).json({
                success: false,
                message: 'Invalid amount'
            });
        }

        if (
            !process.env.RAZORPAY_KEY ||
            !process.env.RAZORPAY_SECRET
        ) {

            return res.status(500).json({
                success: false,
                message: 'Razorpay configuration is missing'
            });
        }

        const order = await razorpay.orders.create({

            amount: Math.round(amount),

            currency: 'INR',

            receipt:
                `receipt_${Date.now()}`

        });

        return res.status(200).json({
            success: true,
            order
        });

    } catch (error) {

        console.error(
            'RAZORPAY CREATE ORDER ERROR:',
            error
        );

        // NEVER create fake payment orders here.
        return res.status(500).json({
            success: false,
            message: 'Unable to create Razorpay order'
        });
    }
};


// ============================================================
// RAZORPAY
// VERIFY PAYMENT
//
// POST /api/payment/verify
// ============================================================

exports.verifyPayment = async (req, res) => {

    try {

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body || {};

        if (
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature
        ) {

            return res.status(400).json({
                success: false,
                message: 'Payment verification data is missing'
            });
        }

        if (!process.env.RAZORPAY_SECRET) {

            return res.status(500).json({
                success: false,
                message: 'Razorpay secret is missing'
            });
        }

        const body =
            `${razorpay_order_id}|${razorpay_payment_id}`;

        const expectedSignature =
            crypto
                .createHmac(
                    'sha256',
                    process.env.RAZORPAY_SECRET
                )
                .update(body)
                .digest('hex');

        // --------------------------------------------------------
        // VALID SIGNATURE
        // --------------------------------------------------------

        if (
            crypto.timingSafeEqual(
                Buffer.from(expectedSignature),
                Buffer.from(razorpay_signature)
            )
        ) {

            return res.status(200).json({
                success: true,
                message: 'Payment verified successfully'
            });
        }

        // --------------------------------------------------------
        // INVALID SIGNATURE
        // --------------------------------------------------------

        return res.status(400).json({
            success: false,
            message: 'Payment signature verification failed'
        });

    } catch (error) {

        console.error(
            'RAZORPAY VERIFY ERROR:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Payment verification failed'
        });
    }
};


// ============================================================
// GET RAZORPAY PUBLIC KEY
//
// GET /api/payment/get-key
// ============================================================

exports.getKey = (req, res) => {
    return res.status(200).json({
        success: true,
        key: process.env.RAZORPAY_KEY || 'rzp_test_SNp3LdS68VtVwj',
        hdfcMerchantId: process.env.HDFC_MERCHANT_ID || 'SG5807',
        hdfcClientId: process.env.HDFC_CLIENT_ID || 'hdfcmaster'
    });
};


exports.mockHdfcPage = (req, res) => {
    const { orderId, returnUrl } = req.query;
    res.send(`
        <html>
            <head>
                <title>HDFC Mock Gateway</title>
                <style>
                    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f4f8; margin: 0; }
                    .card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 100%; }
                    button { background: #004b8f; color: white; border: none; padding: 12px 24px; font-size: 16px; border-radius: 6px; cursor: pointer; margin-top: 20px; width: 100%; }
                    button.fail { background: #d93838; margin-top: 10px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h2>HDFC Mock Gateway (Local Testing)</h2>
                    <p>Order ID: <strong>${orderId}</strong></p>
                    <p>The real HDFC UAT server is unreachable. You are viewing this mock page to continue testing your flow.</p>
                    <form method="POST" action="${returnUrl}">
                        <input type="hidden" name="order_id" value="${orderId}" />
                        <input type="hidden" name="order_status" value="CHARGED" />
                        <button type="submit">Simulate Successful Payment</button>
                    </form>
                    <form method="POST" action="${returnUrl}">
                        <input type="hidden" name="order_id" value="${orderId}" />
                        <input type="hidden" name="order_status" value="FAILED" />
                        <button type="submit" class="fail">Simulate Failed Payment</button>
                    </form>
                </div>
            </body>
        </html>
    `);
};
