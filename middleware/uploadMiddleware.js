const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

// this is to ensure temporary upload directory exists
const uploadDir = path.join(__dirname, '../uploads/temp');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
}

// configure disk storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
        // generating uniwue name: timestamp-uuid.extension
        const uniqueSuffix = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueSuffix);
    }
})

// file validation filter
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/jpg",
        "image/pjpeg",
        "image/x-png"
    ];
    const allowedExtensions = /^\.(jpe?g|png|webp)$/i;
    const ext = path.extname(file.originalname).toLowerCase();
    const isMimeValid = allowedMimeTypes.includes((file.mimetype || "").toLowerCase());
    const isExtValid = allowedExtensions.test(ext);

    if (isMimeValid || isExtValid) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type (${file.mimetype || "unknown"}). Only JPEG, PNG, and WebP are allowed.`), false);
    }
}

// multer upload instance
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 15 * 1024 * 1024
    }
})

module.exports = upload