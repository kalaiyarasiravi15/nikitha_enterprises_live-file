const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// 10MB Limit for images
const limits = { fileSize: 10 * 1024 * 1024 };

// 100MB Limit for products (includes brochures)
const productLimits = { fileSize: 100 * 1024 * 1024 };

const baseMulter = multer({ storage, limits });

// Brochure file filter — only allow documents
const brochureFileFilter = (req, file, cb) => {
    if (file.fieldname === 'brochures') {
        const allowedTypes = [
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        const allowedExts = ['.pdf', '.txt', '.doc', '.docx', '.xls', '.xlsx'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Brochure files must be PDF, TXT, DOC, DOCX, XLS, or XLSX'), false);
        }
    } else {
        cb(null, true);
    }
};

// Product upload multer with brochure support (20MB limit)
const productMulter = multer({ 
    storage, 
    limits: productLimits,
    fileFilter: brochureFileFilter
});

// Define Upload Types
const rawUpload = baseMulter.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'thumbnails', maxCount: 15 }
]);

const rawDealUpload = baseMulter.single('image');
const rawCategoryUpload = baseMulter.single('image');
const rawThumbnailUpload = baseMulter.array('thumbnails', 15);

// Product upload accepts dynamic fields for variant main images, variant thumbnails, mainImage, thumbnails, and thumbVideo
const rawProductUpload = productMulter.any();


const rawBlogUpload = baseMulter.single('image');
const rawTestimonialUpload = baseMulter.single('image');

const rawReviewUpload = baseMulter.array('images', 3);
const rawSettingUpload = baseMulter.fields([{ name: 'images', maxCount: 1 }]);

const handleMulterError = (uploadFunction) => (req, res, next) => {
    uploadFunction(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: "File size is too large. Maximum 100MB allowed." });
            }
            return res.status(400).json({ message: err.message });
        } else if (err) {
            return res.status(400).json({ message: err.message || "Internal Server Error during upload." });
        }
        next();
    });
};

module.exports = { 
    upload: handleMulterError(rawUpload), 
    dealUpload: handleMulterError(rawDealUpload),
    categoryUpload: handleMulterError(rawCategoryUpload), 
    thumbnailUpload: handleMulterError(rawThumbnailUpload), 
    productUpload: handleMulterError(rawProductUpload),
    blogUpload: handleMulterError(rawBlogUpload),
    testimonialUpload: handleMulterError(rawTestimonialUpload),
    reviewUpload: handleMulterError(rawReviewUpload),
    settingUpload: handleMulterError(rawSettingUpload)
};