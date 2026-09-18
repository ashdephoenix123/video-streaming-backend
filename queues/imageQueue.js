const { Queue } = require('bullmq')
const redisConfig = require('../config/redisConfig.js')

// creating bullMQ queue instance
const imageQueue = new Queue("image-processing", {
    connection: redisConfig
})

/**
 * Helper to enqueue an image processing job
 * @param {Object} fileData - Details about the uploaded temp file
 * @returns {Promise<Job>} - The created BullMQ job
 */

const addImageJob = async (fileData) => {
    return await imageQueue.add("compress-and-upload", fileData, {
        attempts: 3, // Retry up to 3 times if it fails
        backoff: {
            type: "exponential",
            delay: 2000, // 2s, 4s, 8s delay between retries
        },
        removeOnComplete: {
            age: 3600, // Keep completed job metadata in Redis for 1 hour so user can check status
            count: 1000, // Or keep the last 1000 completed jobs
        },
        removeOnFail: {
            age: 24 * 3600, // Keep failed jobs for 24 hours for debugging
        },
    });
}

module.exports = {
    imageQueue,
    addImageJob
}