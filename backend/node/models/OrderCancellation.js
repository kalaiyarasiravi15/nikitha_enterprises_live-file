const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const OrderCancellation = sequelize.define('OrderCancellation', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.STRING, allowNull: false },
    cancelType: {
        type: DataTypes.ENUM('PRE_DISPATCH', 'IN_TRANSIT', 'POST_DELIVERY'),
        allowNull: false
    },
    reasonCategory: { type: DataTypes.STRING, allowNull: true },
    reasonText: { type: DataTypes.TEXT, allowNull: true },
    images: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
    video: { type: DataTypes.STRING, allowNull: true },
    customerUpiId: { type: DataTypes.STRING, allowNull: true },
    refundMethod: {
        type: DataTypes.ENUM('SAME_ACCOUNT', 'UPI'),
        defaultValue: 'UPI'
    },
    pickupDate: { type: DataTypes.DATEONLY, allowNull: true },
    pickupTimeSlot: { type: DataTypes.STRING, allowNull: true },
    refundAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
    refundStatus: {
        type: DataTypes.ENUM('NOT_APPLICABLE', 'PENDING', 'INITIATED', 'COMPLETED'),
        defaultValue: 'NOT_APPLICABLE'
    },
    adminApprovedBy: { type: DataTypes.INTEGER, allowNull: true },
    adminApprovedAt: { type: DataTypes.DATE, allowNull: true },
    courierCancelRef: { type: DataTypes.STRING, allowNull: true },
    productReceivedAt: { type: DataTypes.DATE, allowNull: true },
    status: {
        type: DataTypes.ENUM(
            'REQUESTED', 'APPROVED', 'REJECTED',
            'COURIER_NOTIFIED', 'RETURN_PICKUP',
            'PRODUCT_RECEIVED', 'REFUND_INITIATED', 'REFUNDED'
        ),
        defaultValue: 'REQUESTED'
    }
}, { timestamps: true });

module.exports = OrderCancellation;
