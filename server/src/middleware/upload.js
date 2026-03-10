/**
 * Cloudinary configuration.
 * Sets up the cloudinary SDK using environment variables:
 * CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary only if the environment variables are provided
if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

/**
 * Creates dynamic multer storage.
 * If Cloudinary is configured, it uploads straight to Cloudinary.
 * Otherwise, it falls back to local storage inside the `/uploads` directory.
 */
const getStorage = () => {
    if (process.env.CLOUDINARY_CLOUD_NAME) {
        return new CloudinaryStorage({
            cloudinary: cloudinary,
            params: {
                folder: 'medivision_uploads',
                allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
                // Public ID generation strategy can be overridden if needed
            },
        });
    } else {
        // Fallback Local Storage
        const path = require('path');
        const { v4: uuidv4 } = require('uuid');
        const fs = require('fs');

        const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
        
        // Ensure uploads directory exists
        if (!fs.existsSync(UPLOAD_DIR)) {
            fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        }

        return multer.diskStorage({
            destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
            filename: (_req, file, cb) => {
                const ext = path.extname(file.originalname).toLowerCase();
                cb(null, `${uuidv4()}${ext}`);
            },
        });
    }
};

const fileFilter = (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, PNG, and WebP are allowed.'), false);
    }
};

const upload = multer({
    storage: getStorage(),
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

module.exports = upload;
