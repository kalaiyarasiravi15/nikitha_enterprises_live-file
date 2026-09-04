const fs = require('fs');
const path = require('path');
const { Review, Customer, OrderSlot, Product } = require('../models/index');
// 1. Get All Reviews
exports.getAllReviews = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10);
        const limit = parseInt(req.query.limit, 10) || 10;
        
        const query = {
            include: [
                { model: Product, as: 'productInfo', attributes: ['id', 'name'] },
                { model: Customer, as: 'customerInfo', attributes: ['id', 'name', 'email'] }
            ],
            order: [['createdAt', 'DESC']]
        };

        if (page) {
            query.limit = limit;
            query.offset = (page - 1) * limit;
            const { count, rows } = await Review.findAndCountAll(query);
            return res.status(200).json({
                success: true,
                reviews: rows,
                totalCount: count,
                totalPages: Math.ceil(count / limit)
            });
        }

        const reviews = await Review.findAll(query);
        res.status(200).json(reviews);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// 2. Get Particular Review
exports.getParticularReview = async (req, res) => {
    try {
        const review = await Review.findByPk(req.params.id, {
            include: [
                { model: Customer, as: 'customerInfo', attributes: ['name'], paranoid: false },
                { model: Product,  as: 'productInfo',  attributes: ['id', 'name', 'mainImage'], required: false, paranoid: false }
            ]
        });
        if (!review) return res.status(404).json({ error: 'Feedback not found' });
        res.json(review);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 3. Get Published Reviews for a Specific Product
exports.getPublishedReviewsByProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const reviews = await Review.findAll({
            where: { productId, status: 'published' },
            include: [{ model: Customer, as: 'customerInfo', attributes: ['name'], paranoid: false }],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(reviews);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 3b. Get Reviews by Customer ID
exports.getReviewsByCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;
        const reviews = await Review.findAll({
            where: { customerId },
            include: [{ model: Product, as: 'productInfo', attributes: ['name', 'mainImage'], paranoid: false }],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(reviews);
    } catch (err) { res.status(500).json({ error: err.message }); }
};


exports.createFeedback = async (req, res) => {
    try {
        const { customerId, orderId, productId, feedback, rating } = req.body;

        // ── Validate required fields ──
        if (!customerId || !feedback)
            return res.status(400).json({ error: 'customerId and feedback are required' });
        if (!orderId)
            return res.status(400).json({ error: 'orderId is required to submit a review' });

        // ── Resolve productId from OrderSlot if not sent ──
        let resolvedProductId = productId || null;
        if (!resolvedProductId) {
            const orderItem = await OrderSlot.findOne({ where: { orderId } });
            if (orderItem?.productId) resolvedProductId = orderItem.productId;
        }

        // ── Application-level duplicate check ──
        const existing = await Review.findOne({ where: { orderId, customerId, productId: resolvedProductId } });
        if (existing)
            return res.status(409).json({ message: 'You have already reviewed this product' });

        let imagesJSON = null;
        if (req.files && req.files.length > 0) {
            const imagePaths = req.files.map(file => file.filename);
            imagesJSON = JSON.stringify(imagePaths);
        }

        const newReview = await Review.create({
            customerId,
            orderId,                        
            productId: resolvedProductId,  
            feedback,
            rating:    rating || 5,
            status:    'pending',
            images:    imagesJSON
        });

        res.status(201).json(newReview);

    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError')
            return res.status(409).json({ message: 'You have already reviewed this product' });
        console.error('createFeedback error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// 4b. Get Review by Order and Product
exports.getReviewByOrderAndProduct = async (req, res) => {
    try {
        const { orderId, productId } = req.params;
        const review = await Review.findOne({
            where: { orderId, productId }
        });
        if (!review) return res.status(404).json({ error: 'Review not found' });
        res.json(review);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 5. Update Feedback — Admin approves/rejects or edits
exports.updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, feedback } = req.body;

        const review = await Review.findByPk(id);
        if (!review) return res.status(404).json({ error: 'Review not found' });

        await review.update({ status, feedback });
        res.status(200).json({ message: 'Updated successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 6. Delete Feedback
exports.deleteReview = async (req, res) => {
    try {
        const review = await Review.findByPk(req.params.id);
        if (!review) return res.status(404).json({ error: 'Review not found' });
        
        if (review.images) {
            try {
                const images = JSON.parse(review.images);
                images.forEach(img => {
                    const filePath = path.join(__dirname, '..', 'uploads', img);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                });
            } catch(e) { console.error("Error deleting review images", e); }
        }

        await review.destroy();
        res.status(200).json({ message: 'Deleted successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};