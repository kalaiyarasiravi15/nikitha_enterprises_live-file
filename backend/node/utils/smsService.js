/**
 * Sai Techno Solutions SMS client. Every attempt is stored in SmsLogs without
 * saving message bodies (so OTP values never reach the admin log).
 */
const http = require('http');
const https = require('https');
const { URL, URLSearchParams } = require('url');
const SmsLog = require('../models/SmsLog');

const DEFAULT_API_URL = 'http://sms.saitechnosolutions.net';
const DEFAULT_CREDIT_TYPE = '2';
const REQUEST_TIMEOUT_MS = Number(process.env.SMS_TIMEOUT_MS) || 10000;

const config = () => ({
    apiUrl: (process.env.SMS_API_URL || DEFAULT_API_URL).replace(/\/+$/, ''),
    token: String(process.env.SMS_TOKEN || '').trim(),
    sender: String(process.env.SMS_SENDER || '').trim(),
    creditType: String(process.env.SMS_CREDIT_TYPE || DEFAULT_CREDIT_TYPE).trim(),
    creditPath: String(process.env.SMS_CREDIT_PATH || '').trim(),
    // The provider reports error 5601 when this PE-TM hash is blank. Its exact
    // request key is configurable, but defaults to the wording in that error.
    templateHashParam: String(process.env.SMS_TEMPLATE_HASH_PARAM || 'PE_TM_Hash').trim(),
    requireTemplateHash: String(process.env.SMS_REQUIRE_TEMPLATE_HASH || 'true').trim().toLowerCase() !== 'false'
});

const normalizePhone = (phone) => {
    let value = String(phone || '').replace(/\D/g, '');
    if (value.length === 12 && value.startsWith('91')) value = value.slice(2);
    return value.length === 10 ? value : null;
};
const maskedRecipients = (numbers) => numbers.map(number => `******${number.slice(-4)}`).join(', ');
const makeUrl = (apiUrl, path, params) => {
    const url = new URL(`${apiUrl}/${String(path || '').replace(/^\/+|\/+$/g, '')}`);
    url.search = new URLSearchParams(params).toString();
    return url;
};
const responseAccepted = (body) => {
    const text = String(body || '').trim();
    if (!text || /\b(error|invalid|failed|failure|insufficient|unauthori[sz]ed|not approved|blocked|denied)\b/i.test(text)) return false;
    return /\b(success|accepted|submitted|queued|sent|messageid)\b/i.test(text) || /^\d{4,}$/.test(text);
};
const parseMessageId = (body) => {
    const text = String(body || '').trim();
    try {
        const data = JSON.parse(text);
        const id = data.messageId || data.messageid || data.message_id || data.id || data.requestId;
        if (id !== undefined && id !== null) return String(id).slice(0, 255);
    } catch (_) {}
    const match = text.match(/(?:message[ _-]?id|request[ _-]?id|msgid)\s*[:=]\s*([\w.-]+)/i);
    return match ? match[1].slice(0, 255) : (/^\d{4,}$/.test(text) ? text.slice(0, 255) : null);
};

const requestProvider = (url, recipientLabel, redirects = 0) => new Promise(resolve => {
    if (redirects > 5) return resolve({ success: false, error: 'Too many SMS provider redirects' });
    const client = url.protocol === 'https:' ? https : http;
    const request = client.get(url, { timeout: REQUEST_TIMEOUT_MS }, response => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            response.resume();
            return resolve(requestProvider(new URL(response.headers.location, url), recipientLabel, redirects + 1));
        }
        let body = '';
        response.setEncoding('utf8');
        response.on('data', chunk => { body += chunk; });
        response.on('end', () => {
            const success = response.statusCode >= 200 && response.statusCode < 300 && responseAccepted(body);
            if (success) {
                console.log(`[SMS] Provider accepted a message for ${recipientLabel}.`);
                return resolve({ success: true, statusCode: response.statusCode, response: body.trim(), messageId: parseMessageId(body) });
            }
            const error = body.trim() || `Provider returned HTTP ${response.statusCode}`;
            console.error(`[SMS] Provider rejected a message for ${recipientLabel}. HTTP ${response.statusCode}: ${error}`);
            resolve({ success: false, statusCode: response.statusCode, error });
        });
    });
    request.on('timeout', () => request.destroy(new Error('SMS request timed out')));
    request.on('error', error => {
        console.error(`[SMS] Provider request failed for ${recipientLabel}: ${error.message}`);
        resolve({ success: false, error: error.message || 'SMS provider connection failed' });
    });
});

const createLog = async (recipients, messageType) => {
    try { return await SmsLog.create({ recipients, messageType, status: 'QUEUED' }); }
    catch (error) { console.error('[SMS] Could not create SMS log:', error.message); return null; }
};
const updateLog = async (log, values) => {
    if (!log) return;
    try { await log.update(values); } catch (error) { console.error('[SMS] Could not update SMS log:', error.message); }
};

const getTemplateHash = (messageType) => {
    const key = `SMS_TEMPLATE_HASH_${String(messageType || 'GENERAL').replace(/[^A-Z0-9]/gi, '_').toUpperCase()}`;
    return String(process.env[key] || process.env.SMS_TEMPLATE_HASH_DEFAULT || '').trim();
};

const sendSMS = async (phone, message, creditType, messageType = 'GENERAL') => {
    const numbers = String(phone || '').split(',').map(normalizePhone).filter(Boolean);
    const body = String(message || '').trim();
    const settings = config();
    if (!numbers.length) return { success: false, error: 'No valid 10-digit recipient number supplied' };
    if (!body) return { success: false, error: 'SMS message is required' };

    const log = await createLog(maskedRecipients(numbers), messageType);
    if (!settings.token || !settings.sender) {
        const error = 'SMS_TOKEN and SMS_SENDER must be configured on the server';
        await updateLog(log, { status: 'FAILED', error, sentAt: new Date() });
        return { success: false, error, logId: log?.id || null };
    }
    const templateHash = getTemplateHash(messageType);
    if (settings.requireTemplateHash && !templateHash) {
        const error = `Missing DLT template hash for ${messageType}. Configure SMS_TEMPLATE_HASH_${messageType}.`;
        await updateLog(log, { status: 'FAILED', error, sentAt: new Date() });
        return { success: false, error, logId: log?.id || null };
    }

    const params = {
        token: settings.token, credit: creditType || settings.creditType, sender: settings.sender, message: body, number: numbers.join(',')
    };
    if (templateHash) params[settings.templateHashParam] = templateHash;
    const result = await requestProvider(makeUrl(settings.apiUrl, 'sendsms', params), numbers.length === 1 ? maskedRecipients(numbers) : `${numbers.length} recipients`);
    if (result.success) {
        await updateLog(log, { status: 'ACCEPTED', providerMessageId: result.messageId, providerResponse: result.response, sentAt: new Date() });
    } else {
        await updateLog(log, { status: 'FAILED', error: result.error || 'Provider rejected the SMS', providerResponse: result.response || null, sentAt: new Date() });
    }
    return { ...result, logId: log?.id || null };
};

const normalizeDeliveryStatus = value => {
    const status = String(value || '').trim().toUpperCase();
    if (/DELIV|SUCCESS/.test(status)) return 'DELIVERED';
    if (/FAIL|REJECT|EXPIRE|UNDELIV|DND/.test(status)) return 'FAILED';
    if (/PEND|QUEUE|SUBMIT|SENT|PROCESS/.test(status)) return 'PENDING';
    return 'UNKNOWN';
};

exports.recordDeliveryReport = async (payload = {}) => {
    const messageId = payload.messageId || payload.messageid || payload.message_id || payload.msgid || payload.id;
    const providerStatus = payload.status || payload.deliveryStatus || payload.deliverystatus || payload.dlr || payload.messageStatus;
    if (!messageId) return { success: false, error: 'Provider callback did not include a message ID' };
    const log = await SmsLog.findOne({ where: { providerMessageId: String(messageId) }, order: [['createdAt', 'DESC']] });
    if (!log) return { success: false, error: 'No SMS log found for this provider message ID' };
    const status = normalizeDeliveryStatus(providerStatus);
    await log.update({ status, deliveredAt: status === 'DELIVERED' ? new Date() : log.deliveredAt, metadata: { providerStatus: String(providerStatus || ''), callbackReceivedAt: new Date().toISOString() } });
    return { success: true, id: log.id, status };
};

exports.sendOtpSMS = (phone, otp) => sendSMS(phone, `Your OTP for Anyras trove login account registration is ${otp} in https://anyrastrove.com/ This code expires in 5 minutes. Do not share it with anyone. If you didn't request this, please ignore this message`, undefined, 'OTP');
exports.sendOrderConfirmedSMS = (phone, orderId, amount) => sendSMS(phone, `Thank you for shopping with Anyra's Trove . Your order ${orderId} has been confirmed. Total amount: Rs ${amount}. We will notify you once it is shipped.`, undefined, 'ORDER_CONFIRMED');
exports.sendOrderPlacedSMS = (phone, orderId) => sendSMS(phone, `Anyra's Trove: Thank you for your order. Your order # ${orderId} has been successfully placed in https://anyrastrove.com/ . We will update you once it is shipped.`, undefined, 'ORDER_PLACED');
exports.sendOrderShippedSMS = (phone, orderId) => sendSMS(phone, `Anyra's Trove: Your order #${orderId} has been shippedhttps://anyrastrove.com/ . Track your order using the tracking details provided. Thank you for shopping with us.`, undefined, 'ORDER_SHIPPED');
exports.sendWelcomeSMS = phone => sendSMS(phone, "Anyra's Trove: Discover our latest collection of handcrafted brass kitchenware and traditional products. Explore the new arrivals today.", undefined, 'WELCOME');
exports.sendTestSMS = phone => sendSMS(phone, "Anyra's Trove: Discover our latest collection of handcrafted brass kitchenware and traditional products. Explore the new arrivals today.", undefined, 'TEST');
exports.sendLoginAlertSMS = () => Promise.resolve({ success: false, error: 'No approved DLT template for login alert' });
exports.sendAccountDeletedSMS = () => Promise.resolve({ success: false, error: 'No approved DLT template for account deletion' });

exports.sendBulkSMS = async (numbers, message) => {
    const phoneList = (Array.isArray(numbers) ? numbers : String(numbers).split(',')).map(normalizePhone).filter(Boolean);
    if (!phoneList.length) return { success: false, error: 'No valid numbers' };
    const results = [];
    for (let index = 0; index < phoneList.length; index += 500) results.push(await sendSMS(phoneList.slice(index, index + 500).join(','), message, undefined, 'PROMOTIONAL'));
    const failed = results.filter(result => !result.success);
    return { success: failed.length === 0, total: phoneList.length, results, error: failed.length ? `${failed.length} SMS batch(es) were rejected by the provider` : undefined };
};

exports.checkCredits = async () => {
    const settings = config();
    if (!settings.token) return { success: false, error: 'SMS_TOKEN must be configured on the server' };
    if (!settings.creditPath) return { success: false, error: 'SMS_CREDIT_PATH is not configured. Add the exact balance endpoint supplied by Sai Techno Solutions.' };
    const result = await requestProvider(makeUrl(settings.apiUrl, settings.creditPath, { token: settings.token, credit: settings.creditType, sender: settings.sender }), 'credit check');
    return result.success ? { success: true, credits: result.response } : { success: false, error: result.error, statusCode: result.statusCode };
};
exports._normalizePhone = normalizePhone;
