const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const JWT_SECRET = process.env.JWT_SECRET || 'ars_fashion_customer_secret_2026';

const adminMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Access denied. Please login to continue.' });
        }
        
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'Authentication token missing.' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const admin = await Admin.findByPk(decoded.id, { attributes: ['id'] });
        
        if (!admin) {
            return res.status(401).json({ success: false, message: 'This admin account is no longer active.' });
        }
        
        req.adminId = admin.id;
        next();
    } catch (err) {
        console.error('Admin Middleware Error:', err.message);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Your session has expired. Please login again.' });
        }
        return res.status(401).json({ success: false, message: 'Invalid token. Please login again.' });
    }
};

module.exports = adminMiddleware;
