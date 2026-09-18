const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const { uploadImage, getJobStatus } = require("../controller/imageController");

// POST /api/images/upload
router.post("/upload", upload.single("image"), uploadImage);

// GET /api/images/status/:jobId
router.get("/status/:jobId", getJobStatus);

module.exports = router;
