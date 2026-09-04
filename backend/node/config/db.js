const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false
    }
);

// Enforce lowercase table names globally for Linux case-sensitivity compatibility
const modelToTable = {
    'Admin': 'admins',
    'Banner': 'banners',
    'BestSeller': 'bestsellers',
    'Brand': 'brands',
    'Cart': 'carts',
    'Category': 'categories',
    'ContactMessage': 'contactmessages',
    'Coupon': 'coupons',
    'CustomerAddress': 'customeraddresses',
    'Customer': 'customers',
    'Deal': 'deals',
    'NewArrival': 'newarrivals',
    'Newsletter': 'newsletters',
    'OfferBanner': 'offerbanners',
    'Order': 'orders',
    'OrderSlot': 'orderslots',
    'Product': 'products',
    'ProductSpecification': 'productspecifications',
    'ProductVariant': 'productvariants',
    'Review': 'reviews',
    'Setting': 'settings',
    'ShippingAddress': 'shippingaddresses',
    'ShippingRate': 'shippingrates',
    'SubCategory': 'subcategories',
    'SmsLog': 'smslogs',
    'Thumbnail': 'thumbnails',
    'TopRatedProduct': 'topratedproducts',
    'TrendingProduct': 'trendingproducts',
    'Wishlist': 'wishlists'
};

const originalDefine = sequelize.define;
sequelize.define = function (modelName, attributes, options = {}) {
    const tableName = modelToTable[modelName] || (modelName.toLowerCase() + 's');
    options.tableName = tableName;
    options.freezeTableName = true;
    return originalDefine.call(this, modelName, attributes, options);
};

module.exports = sequelize;
