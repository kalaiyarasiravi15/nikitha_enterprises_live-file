const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Stores the lifecycle of every outbound SMS without retaining message content
// (OTP values and customer data must never be copied into an admin log).
const SmsLog = sequelize.define('SmsLog', {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    recipients: { type: DataTypes.TEXT, allowNull: false },
    messageType: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'GENERAL' },
    status: {
        type: DataTypes.ENUM('QUEUED', 'ACCEPTED', 'PENDING', 'DELIVERED', 'FAILED', 'UNKNOWN'),
        allowNull: false,
        defaultValue: 'QUEUED'
    },
    providerMessageId: { type: DataTypes.STRING(255), allowNull: true },
    providerResponse: { type: DataTypes.TEXT, allowNull: true },
    error: { type: DataTypes.TEXT, allowNull: true },
    sentAt: { type: DataTypes.DATE, allowNull: true },
    deliveredAt: { type: DataTypes.DATE, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true }
});

module.exports = SmsLog;
