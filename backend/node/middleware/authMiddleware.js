const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');

const JWT_SECRET = process.env.JWT_SECRET || 'ars_fashion_customer_secret_2026'; 

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

      
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access denied. Please login to continue.' 
            });
        }

        // 2. Extract the token
        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication token missing.' 
            });
        }

        // 3. Verify the token
        const decoded = jwt.verify(token, JWT_SECRET);

      
        // A token from a deleted account must not keep working until it expires.
        // `findByPk` respects the Customer paranoid (soft-delete) setting.
        const customer = await Customer.findByPk(decoded.id, { attributes: ['id'] });
        if (customer) {
            req.customerId = customer.id;
            return next();
        }
        
        const Admin = require('../models/Admin');
        const admin = await Admin.findByPk(decoded.id, { attributes: ['id'] });
        if (admin) {
            req.adminId = admin.id;
            return next();
        }

        return res.status(401).json({
            success: false,
            message: 'This account is no longer active. Please register or login again.'
        });
        next();

    } catch (err) {
        console.error('Auth Middleware Error:', err.message);

       
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Your session has expired. Please login again.' 
            });
        }

       
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid token. Please login again.' 
        });
    }
};

module.exports = authMiddleware;
