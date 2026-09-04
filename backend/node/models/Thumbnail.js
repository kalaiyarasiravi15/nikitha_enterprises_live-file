const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Thumbnail = sequelize.define('Thumbnail', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    image: { type: DataTypes.STRING, allowNull: false }
});

module.exports = Thumbnail;