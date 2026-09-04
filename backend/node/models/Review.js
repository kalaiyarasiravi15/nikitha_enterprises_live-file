const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Review = sequelize.define('Review', {
    id: { 
        type: DataTypes.INTEGER, 
        autoIncrement: true, 
        primaryKey: true 
    },
    customerId: { 
        type: DataTypes.INTEGER, 
        allowNull: false,
        references: { model: 'customers', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    orderId: {
        type: DataTypes.STRING,
        allowNull: true,            
        references: { model: 'Orders', key: 'orderId' },
        onDelete: 'SET NULL',      
        onUpdate: 'CASCADE'
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'Products', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
        validate: { min: 1, max: 5 }
    },
    feedback: { 
        type: DataTypes.TEXT, 
        allowNull: false 
    },
    status: { 
        type: DataTypes.ENUM('pending', 'published', 'rejected'), 
        defaultValue: 'pending' 
    },
    images: {
        type: DataTypes.TEXT, // Storing JSON serialized array of image paths
        allowNull: true
    }
}, { 
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['orderId', 'productId', 'customerId'],
            name: 'unique_review_per_order_per_product_per_customer'
        }
    ]
});

module.exports = Review;