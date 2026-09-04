const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Admin = sequelize.define('Admin', {
    id: { 
        type: DataTypes.INTEGER, 
        autoIncrement: true, 
        primaryKey: true 
    },
    email: { 
        type: DataTypes.STRING, 
        allowNull: false, 
        unique: true,
        validate: { isEmail: true } 
    },
    password: { 
        type: DataTypes.STRING, 



        
        allowNull: false 
    },
    role: {
        type: DataTypes.STRING,
        defaultValue: 'admin' // 'admin' or 'employee'
    }
});

module.exports = Admin;