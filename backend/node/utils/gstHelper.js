const GST_SLABS = [5, 12, 18, 28];

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

function calculateGstPrice({ enteredPrice, gstType, gstPercent }) {
    const price = Number(enteredPrice);
    const percent = Number(gstPercent);
    const type = String(gstType || '').toLowerCase();

    if (!Number.isFinite(price) || price <= 0) throw new Error('Price must be a positive number.');
    if (!GST_SLABS.includes(percent)) throw new Error('GST percentage must be 5, 12, 18, or 28.');
    if (!['include', 'exclude'].includes(type)) throw new Error('GST type must be include or exclude.');

    if (type === 'exclude') {
        const basePrice = roundMoney(price);
        const gstAmount = roundMoney(basePrice * percent / 100);
        return { basePrice, gstPercent: percent, gstAmount, finalPrice: roundMoney(basePrice + gstAmount), gstType: type };
    }

    const finalPrice = roundMoney(price);
    const basePrice = roundMoney(finalPrice / (1 + percent / 100));
    return { basePrice, gstPercent: percent, gstAmount: roundMoney(finalPrice - basePrice), finalPrice, gstType: type };
}

// An order can have an offer price. Its final payable price remains tax-inclusive,
// while the product's original GST type is retained for invoice wording.
function breakdownFromFinalPrice(finalPrice, gstPercent, gstType) {
    const result = calculateGstPrice({ enteredPrice: finalPrice, gstType: 'include', gstPercent });
    return { ...result, gstType: gstType || 'include' };
}

module.exports = { GST_SLABS, roundMoney, calculateGstPrice, breakdownFromFinalPrice };
