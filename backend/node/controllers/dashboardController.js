const sequelize = require('../config/db');
const { QueryTypes } = require('sequelize');
const { ContactMessage, Order, OrderCancellation } = require('../models');

exports.getBadgeCounts = async (req, res) => {
    try {
        const [inboxCount, preorderCount, cancelCount] = await Promise.all([
            ContactMessage.count({ where: { isRead: false, isDeleted: false } }).catch(() => 0),
            Order.count({ where: { isPreorder: true, orderStatus: 'Pending' } }).catch(() => 0),
            OrderCancellation.count({ where: { status: 'REQUESTED' } }).catch(() => 0)
        ]);
        res.json({ inboxCount, preorderCount, cancelCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAdminDashboardStats = async (req, res) => {
    try {
        // ── 1. Total Sales (Delivered only)
        const salesRows = await sequelize.query(
            `SELECT COALESCE(SUM(totalAmount), 0) AS totalSales
             FROM orders WHERE orderStatus = 'Delivered'`,
            { type: QueryTypes.SELECT }
        ).catch(() => [{ totalSales: 0 }]);

        // 2. Total Orders
        const ordersRows = await sequelize.query(
            `SELECT COUNT(*) AS totalOrders FROM orders`,
            { type: QueryTypes.SELECT }
        ).catch(() => [{ totalOrders: 0 }]);

        // 3. Registered User (Active only)
        const usersRows = await sequelize.query(
            `SELECT COUNT(*) AS totalRegistered FROM customers WHERE deletedAt IS NULL`,
            { type: QueryTypes.SELECT }
        ).catch(() => [{ totalRegistered: 0 }]);

        // 3b. Inactive Customers (Deleted)
        const inactiveUsersRows = await sequelize.query(
            `SELECT COUNT(*) AS totalInactive FROM customers WHERE deletedAt IS NOT NULL`,
            { type: QueryTypes.SELECT }
        ).catch(() => [{ totalInactive: 0 }]);

        // 4. Active Customers 
        const custRows = await sequelize.query(
            `SELECT COUNT(DISTINCT customerId) AS totalCustomers FROM orders`,
            { type: QueryTypes.SELECT }
        ).catch(() => [{ totalCustomers: 0 }]);

        // 5. New Orders Today 
        const todayRows = await sequelize.query(
            `SELECT COUNT(*) AS newOrdersToday
             FROM orders WHERE DATE(createdAt) = CURDATE()`,
            { type: QueryTypes.SELECT }
        ).catch(() => [{ newOrdersToday: 0 }]);

        // 6. Today Deliveries (orders delivered today)
        const deliveredTodayRows = await sequelize.query(
            `SELECT COUNT(*) AS deliveredToday
             FROM orders
             WHERE orderStatus = 'Delivered'
               AND DATE(updatedAt) = CURDATE()`,
            { type: QueryTypes.SELECT }
        ).catch(() => [{ deliveredToday: 0 }]);

        // 6b. COD Sales & Orders
        const codRows = await sequelize.query(
            `SELECT 
                COALESCE(SUM(totalAmount), 0) AS codSales,
                COUNT(*) AS codOrders
             FROM orders WHERE paymentMethod IN ('COD', 'Cash on Delivery', 'Cash On Delivery')`,
            { type: QueryTypes.SELECT }
        ).catch(() => [{ codSales: 0, codOrders: 0 }]);

        // 6c. Online Paid Sales & Orders (where paymentMethod is Online, avoiding overlap with COD)
        const paidRows = await sequelize.query(
            `SELECT 
                COALESCE(SUM(totalAmount), 0) AS paidSales,
                COUNT(*) AS paidOrders
             FROM orders WHERE paymentMethod IN ('Online Payment', 'Online', 'Online Payment (HDFC)', 'HDFC', 'Razorpay', 'Card')`,
            { type: QueryTypes.SELECT }
        ).catch(() => [{ paidSales: 0, paidOrders: 0 }]);

        // 7. Top Selling Products 
        const topProducts = await sequelize.query(
            `SELECT
                os.productId,
                SUM(os.quantity)                 AS totalSold,
                SUM(os.salesPrice * os.quantity) AS totalRevenue,
                p.name                           AS productName,
                p.mainImage                      AS mainImage,
                (SELECT t.image FROM thumbnails t
                 WHERE t.productId = p.id
                 ORDER BY t.id ASC LIMIT 1)      AS thumbImage
             FROM orderslots os
             JOIN products p ON p.id = os.productId
             GROUP BY os.productId, p.name, p.mainImage
             ORDER BY totalSold DESC
             LIMIT 8`,
            { type: QueryTypes.SELECT }
        ).catch(() => []);

        const topProductsFormatted = (topProducts || []).map(p => ({
            productId:    p.productId,
            totalSold:    parseInt(p.totalSold)       || 0,
            totalRevenue: parseFloat(p.totalRevenue)  || 0,
            Product: {
                name: p.productName,
                mainImage: p.mainImage,
                Thumbnails: p.thumbImage ? [{ url: p.thumbImage, image: p.thumbImage }] : [],
                thumbnails: p.thumbImage ? [{ url: p.thumbImage, image: p.thumbImage }] : []
            }
        }));

        // 8. Monthly Revenue — Delivered orders 
        const revenueChart = await sequelize.query(
            `SELECT
                MONTHNAME(createdAt)             AS month,
                MONTH(createdAt)                 AS monthNum,
                COALESCE(SUM(totalAmount), 0)    AS val,
                COUNT(*)                         AS orderCount
             FROM orders
             WHERE orderStatus = 'Delivered'
             GROUP BY MONTH(createdAt), MONTHNAME(createdAt)
             ORDER BY MONTH(createdAt) ASC`,
            { type: QueryTypes.SELECT }
        ).catch(() => []);

        // 9. All Orders — monthly
        const allRevenueChart = await sequelize.query(
            `SELECT
                MONTHNAME(createdAt)             AS month,
                MONTH(createdAt)                 AS monthNum,
                COALESCE(SUM(totalAmount), 0)    AS val,
                COUNT(*)                         AS orderCount
             FROM orders
             GROUP BY MONTH(createdAt), MONTHNAME(createdAt)
             ORDER BY MONTH(createdAt) ASC`,
            { type: QueryTypes.SELECT }
        ).catch(() => []);

        // 10. Order Status Distribution
        const statusDist = await sequelize.query(
            `SELECT orderStatus, COUNT(*) AS count
             FROM orders GROUP BY orderStatus`,
            { type: QueryTypes.SELECT }
        ).catch(() => []);

        // 11. New Registrations — last 30 days
        const newUsersDaily = await sequelize.query(
            `SELECT
                DATE(createdAt) AS date,
                COUNT(*)        AS count
             FROM customers
             WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY DATE(createdAt)
             ORDER BY DATE(createdAt) ASC`,
            { type: QueryTypes.SELECT }
        ).catch(() => []);

        // 12. New Orders Daily
        const newOrdersDaily = await sequelize.query(
            `SELECT
                DATE(createdAt)              AS date,
                COUNT(*)                     AS count,
                COALESCE(SUM(totalAmount),0) AS revenue
             FROM orders
             WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             GROUP BY DATE(createdAt)
             ORDER BY DATE(createdAt) ASC`,
            { type: QueryTypes.SELECT }
        ).catch(() => []);

        // Send response
        res.json({
            stats: {
                totalSales:      parseFloat(salesRows[0]?.totalSales)   || 0,
                totalOrders:     parseInt(ordersRows[0]?.totalOrders)    || 0,
                totalRegistered: parseInt(usersRows[0]?.totalRegistered) || 0,
                totalInactive:   parseInt(inactiveUsersRows[0]?.totalInactive) || 0,
                totalCustomers:  parseInt(custRows[0]?.totalCustomers)   || 0,
                newOrdersToday:  parseInt(todayRows[0]?.newOrdersToday)  || 0,
                deliveredToday:  parseInt(deliveredTodayRows[0]?.deliveredToday) || 0,
                codSales:        parseFloat(codRows[0]?.codSales)        || 0,
                codOrders:       parseInt(codRows[0]?.codOrders)         || 0,
                paidSales:       parseFloat(paidRows[0]?.paidSales)      || 0,
                paidOrders:      parseInt(paidRows[0]?.paidOrders)       || 0,
            },
            topProducts:    topProductsFormatted,
            revenueChart:   revenueChart || [],
            allRevenueChart: allRevenueChart || [],
            statusDist:     statusDist || [],
            newUsersDaily:  newUsersDaily || [],
            newOrdersDaily: newOrdersDaily || []
        });

    } catch (error) {
        console.error('Dashboard Error:', error.message);
        res.json({
            stats: {
                totalSales: 0, totalOrders: 0, totalRegistered: 0, totalInactive: 0,
                totalCustomers: 0, newOrdersToday: 0, deliveredToday: 0,
                codSales: 0, codOrders: 0, paidSales: 0, paidOrders: 0
            },
            topProducts: [], revenueChart: [], allRevenueChart: [], statusDist: [], newUsersDaily: [], newOrdersDaily: []
        });
    }
};