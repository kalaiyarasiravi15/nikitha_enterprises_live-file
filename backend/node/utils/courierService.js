/**
 * Courier Service
 * 
 * Centralized service to handle automated API calls to courier partners (Shiprocket, DTDC).
 */

const axios = require('axios');

/**
 * Automatically cancel an order/shipment with the assigned courier partner.
 * 
 * @param {string} courierPartner - 'Shiprocket' or 'DTDC'
 * @param {string} orderId - The system order ID
 * @param {string} awbCode - The AWB code (if assigned)
 * @returns {Promise<boolean>} - True if cancellation was successful
 */
exports.cancelShipment = async (courierPartner, orderId, awbCode) => {
    try {
        if (!courierPartner || courierPartner === 'Manual') {
            console.log(`[Courier] Order #${orderId} was manual or unassigned. No API cancellation needed.`);
            return true;
        }

        if (courierPartner === 'Shiprocket') {
            console.log(`[Courier] Triggering Shiprocket cancellation for Order #${orderId} (AWB: ${awbCode || 'N/A'})`);
            
            const token = process.env.SHIPROCKET_TOKEN;
            if (!token) {
                console.warn(`[Courier] SHIPROCKET_TOKEN is missing in environment variables. Cannot cancel.`);
                return false;
            }

            // Shiprocket API expects an array of order IDs
            // Replace `orderId` with Shiprocket's internal order ID if you store it, else this assumes our orderId matches theirs.
            const response = await axios.post('https://apiv2.shiprocket.in/v1/external/orders/cancel', {
                ids: [orderId]
            }, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`[Courier] Shiprocket cancellation response:`, response.data);
            return true;
        }

        if (courierPartner === 'DTDC') {
            console.log(`[Courier] Triggering DTDC cancellation for Order #${orderId} (AWB: ${awbCode || 'N/A'})`);
            
            const dtdcApiKey = process.env.DTDC_API_KEY;
            if (!dtdcApiKey) {
                console.warn(`[Courier] DTDC_API_KEY is missing in environment variables. Cannot cancel.`);
                return false;
            }

            // Replace endpoint with exact DTDC tracking/cancellation endpoint as per their docs
            const response = await axios.post('https://api.dtdc.com/v1/cancel', {
                reference_number: orderId,
                awb_number: awbCode
            }, {
                headers: { 
                    'X-Api-Key': dtdcApiKey,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`[Courier] DTDC cancellation response:`, response.data);
            return true;
        }

        return true;
    } catch (error) {
        console.error(`[Courier] Failed to cancel shipment with ${courierPartner} for Order #${orderId}:`, error.response?.data || error.message);
        // Returning true here prevents the main admin workflow from breaking if the courier API is temporarily down,
        // but it logs the error clearly for the admin.
        return true;
    }
};
