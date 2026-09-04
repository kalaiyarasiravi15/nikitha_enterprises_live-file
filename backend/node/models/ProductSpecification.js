const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProductSpecification = sequelize.define('ProductSpecification', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Products', key: 'id' }
    },
    heading: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
});

module.exports = ProductSpecification;
