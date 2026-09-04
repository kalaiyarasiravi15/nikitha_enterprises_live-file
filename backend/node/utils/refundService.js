/**
 * Refund Service
 * 
 * Centralized service to handle automated API calls for refunds.
 * Currently integrates with HDFC SmartGateway (Juspay).
 */

const axios = require('axios');

/**
 * Process a refund through HDFC SmartGateway API.
 * 
 * @param {string} orderId - The system order ID
 * @param {number} amount - The amount to refund
 * @returns {Promise<boolean>} - True if refund was successfully initiated
 */
exports.processHdfcRefund = async (orderId, amount) => {
    try {
        console.log(`[RefundService] Initiating HDFC SmartGateway refund for Order #${orderId}, Amount: ${amount}`);

        const merchantId = process.env.HDFC_MERCHANT_ID;
        const apiKey = process.env.HDFC_API_KEY;

        if (!merchantId || !apiKey) {
            console.warn(`[RefundService] HDFC_MERCHANT_ID or HDFC_API_KEY missing in environment variables. Refund failed.`);
            return false; // Return false so the admin knows it failed
        }

        // HDFC SmartGateway uses Basic Auth with base64 encoded apiKey
        const authHeader = 'Basic ' + Buffer.from(apiKey + ':').toString('base64');
        
        // Use unique request ID to prevent duplicate refunds
        const uniqueRequestId = `refund_${orderId}_${Date.now()}`;

        const payload = {
            unique_request_id: uniqueRequestId,
            amount: amount
        };

        const endpoint = `https://smartgateway.hdfcbank.com/orders/${orderId}/refunds`;

        const response = await axios.post(endpoint, payload, {
            headers: {
                'Authorization': authHeader,
                'x-merchantid': merchantId,
                'Content-Type': 'application/json'
            }
        });

        // SmartGateway typically returns status like "PROCESSED" or "PENDING" or "CREATED"
        const status = response.data?.status;
        console.log(`[RefundService] HDFC Refund Response Status for #${orderId}: ${status}`);

        if (status === 'PROCESSED' || status === 'PENDING' || status === 'CREATED') {
            return true;
        }

        console.error(`[RefundService] Refund failed with status: ${status}`, response.data);
        return false;

    } catch (error) {
        console.error(`[RefundService] Error processing HDFC refund for Order #${orderId}:`, error.response?.data || error.message);
        return false;
    }
};
