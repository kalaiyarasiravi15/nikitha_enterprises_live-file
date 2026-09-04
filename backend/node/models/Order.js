const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Order = sequelize.define('Order', {
    orderId: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    customerId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    customerType: {
        type: DataTypes.ENUM('REGISTERED', 'GUEST'),
        allowNull: false,
        defaultValue: 'REGISTERED'
    },
    guestSessionId: { type: DataTypes.STRING(80), allowNull: true },
    guestEmail: { type: DataTypes.STRING, allowNull: true },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    discountAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    isPreorder: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    shippingAmount: {          // ← NEW: state-wise shipping charge stored here
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        allowNull: true,
    },
    paymentStatus: {
        type: DataTypes.ENUM('Pending', 'Paid', 'Failed'),
        defaultValue: 'Pending'
    },
    paymentMethod: {
        type: DataTypes.STRING,
        defaultValue: 'Online'
    },
    invoiceType: {
        type: DataTypes.ENUM('CUSTOMER', 'BUSINESS_GST'),
        allowNull: false,
        defaultValue: 'CUSTOMER'
    },
    businessName: { type: DataTypes.STRING, allowNull: true },
    businessGstin: { type: DataTypes.STRING(15), allowNull: true },
    billingAddress: { type: DataTypes.TEXT, allowNull: true },
    billingState: { type: DataTypes.STRING, allowNull: true },
    billingPincode: { type: DataTypes.STRING(6), allowNull: true },
    paymentId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    razorpayOrderId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    orderStatus: {
        type: DataTypes.ENUM(
            'Pending',
            'Confirmed',
            'Shipped',
            'Out for Delivery',
            'Delivered',
            'Cancelled'
        ),
        defaultValue: 'Pending'
    },
    couponId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    shippingAddressId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    shiprocket_order_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    shiprocket_shipment_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    awb_code: {
        type: DataTypes.STRING,
        allowNull: true
    },
    tracking_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    courierPartner: {
        type: DataTypes.ENUM('Shiprocket', 'DTDC', 'Manual'),
        allowNull: true
    },
    cancellationStatus: {
        type: DataTypes.ENUM('Requested', 'Approved', 'Rejected'),
        allowNull: true
    },
    cancellationReason: {
        type: DataTypes.STRING,
        allowNull: true
    },

    courierShippingCost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    courierPaymentStatus: {
        type: DataTypes.ENUM('Unpaid', 'Paid'),
        allowNull: false,
        defaultValue: 'Unpaid'
    },
    courierSettlementDate: {
        type: DataTypes.DATE,
        allowNull: true
    },

    snapName:        { type: DataTypes.STRING, allowNull: true },
    snapPhone:       { type: DataTypes.STRING, allowNull: true },
    snapAddressLine: { type: DataTypes.STRING, allowNull: true },
    snapCity:        { type: DataTypes.STRING, allowNull: true },
    snapDistrict:    { type: DataTypes.STRING, allowNull: true },
    snapState:       { type: DataTypes.STRING, allowNull: true },
    snapPincode:     { type: DataTypes.STRING(6), allowNull: true },

    codAmountStatus: {
        type: DataTypes.ENUM('pending', 'partial', 'paid'),
        allowNull: true,
        defaultValue: null
    },
    codReceivedAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
    },

}, {
    timestamps: true
});

module.exports = Order;
