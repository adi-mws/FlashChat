import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure the folder exists or create it
const ensureFolderExists = (folderPath) => {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }
};

// Multer storage configuration for dynamic folders
const getStorage = (folder) => multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads', folder);
        ensureFolderExists(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

// File filter for image validation
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images are allowed.'));
    }
};

// Middleware for uploading a single image with the field name `pfp` to `/uploads/pfps`
export const uploadPfp = multer({
    storage: getStorage('pfps'),
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max file size
}).single('pfp');

// Middleware for uploading a single media file to `/uploads/media`
export const uploadMedia = multer({
    storage: getStorage('media'),
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
}).single('media');
