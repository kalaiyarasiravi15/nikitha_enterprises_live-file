require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const { DataTypes } = require('sequelize');
const { sequelize } = require('./models/index');

const app = express();

// Simplified CORS to allow everything
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/admin',          require('./routes/adminRoutes'));
app.use('/api/categories',     require('./routes/categoryRoutes'));
app.use('/api/subcategories',  require('./routes/subCategoryRoutes'));
app.use('/api/brands',         require('./routes/brandRoutes'));
app.use('/api/banners',        require('./routes/bannerRoutes'));
app.use('/api/offer-banners',  require('./routes/offerBannerRoutes'));
app.use('/api/contact',        require('./routes/contactRoutes'));
app.use('/api/coupons',        require('./routes/couponRoutes'));
app.use('/api/products',       require('./routes/productRoutes'));
app.use('/api/variants',       require('./routes/variantRoutes'));
app.use('/api/thumbnails',     require('./routes/thumbRoutes'));
app.use('/api/customers',      require('./routes/customerRoutes'));
app.use('/api/orders',         require('./routes/orderRoutes'));
app.use('/api/reviews',        require('./routes/reviewRoutes'));
app.use('/api/dashboard',      require('./routes/dashboardRoutes'));
app.use('/api/collections',    require('./routes/collectionRoutes'));
app.use('/api/deals',          require('./routes/dealRoutes'));
app.use('/api/Cart',           require('./routes/cartRoutes'));
app.use('/api/wishlist',       require('./routes/whislistRoutes'));
app.use('/api/payment',        require('./routes/paymentRoutes'));
app.use('/api/shipping',       require('./routes/shippingZoneRoutes'));
// Shipping-zone routes own `/rate`; mounting the legacy rate routes first
// returned its old response before the zone calculator could run.
app.use('/api/shipping',       require('./routes/shippingRoutes'));
app.use('/api/cancellations',  require('./routes/cancellationRoutes'));
app.use('/api/tracker',        require('./routes/codTrackerRoutes'));
app.use('/api/settings',       require('./routes/settingRoutes'));
app.use('/api/newsletter',     require('./routes/newsletterRoutes'));
app.use('/api/sms',            require('./routes/smsRoutes'));

app.get('/', (req, res) => res.send(`Anyra's Trove API Running`));


const PORT = process.env.PORT || 5000;


process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err.message, err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection:', reason);
});

const { runAllMigrations } = require('./utils/migrations');

runAllMigrations()
    .then(() => {
        console.log('DB Connected & Synced (All Migrations Applied)');
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }).catch(err => console.error('Sync/Migration Error:', err));
