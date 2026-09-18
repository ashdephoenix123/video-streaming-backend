const asyncHandler = require("express-async-handler");
const { addImageJob, imageQueue } = require("../queues/imageQueue");

/**
 * @desc   Upload single image & dispatch compression job
 * @route  POST /api/images/upload
 * @access Public
 */
const uploadImage = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Please upload an image file (field name: 'image')." });
    }

    // 1. Prepare job payload with temp file info
    const fileData = {
        tempPath: req.file.path,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
    };

    // 2. Add job to BullMQ queue
    const job = await addImageJob(fileData);
    console.log('JOB', job)

    // 3. Immediately respond with 202 Accepted
    res.status(202).json({
        success: true,
        message: "Image uploaded. Compression & upload started in background.",
        jobId: job.id,
        file: {
            originalName: req.file.originalname,
            size: req.file.size,
        },
    });
});

/**
 * @desc   Get job processing status and progress
 * @route  GET /api/images/status/:jobId
 * @access Public
 */
const getJobStatus = asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    const job = await imageQueue.getJob(jobId);

    if (!job) {
        return res.status(404).json({ error: "Job not found or expired." });
    }

    // Get current job state (waiting, active, completed, failed)
    const state = await job.getState();

    res.status(200).json({
        jobId: job.id,
        state, // 'waiting' | 'active' | 'completed' | 'failed'
        progress: job.progress || 0,
        result: job.returnvalue || null,
        failedReason: job.failedReason || null,
    });
});

module.exports = {
    uploadImage,
    getJobStatus,
};
