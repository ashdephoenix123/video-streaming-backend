const { Worker } = require("bullmq");
const fs = require("fs").promises;
const path = require("path");
const sharp = require("sharp");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const redisConfig = require("../config/redisConfig");
const r2Client = require("../config/r2Client");

const imageWorker = new Worker(
    "image-processing",
    async (job) => {
        const { tempPath, originalName, size } = job.data;

        try {
            // Step 1: Read raw file from disk
            await job.updateProgress(15);
            const inputBuffer = await fs.readFile(tempPath);

            // Step 2: Compress and convert image to WebP with Sharp
            await job.updateProgress(40);
            const compressedBuffer = await sharp(inputBuffer)
                .webp({ quality: 10, effort: 4 })
                .toBuffer();

            const compressedSize = compressedBuffer.length;
            const savingsPercent = (((size - compressedSize) / size) * 100).toFixed(2);

            // Step 3: Upload compressed image to Cloudflare R2
            await job.updateProgress(70);
            const sanitizedBaseName = path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, "_");
            const fileKey = `images/${Date.now()}-${sanitizedBaseName}.webp`;

            await r2Client.send(
                new PutObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: fileKey,
                    Body: compressedBuffer,
                    ContentType: "image/webp",
                })
            );

            // Step 4: Build accessible URL
            const publicBaseUrl = process.env.R2_PUBLIC_URL || "";
            const fileUrl = publicBaseUrl ? `${publicBaseUrl}/${fileKey}` : fileKey;

            await job.updateProgress(90);

            // Step 5: Complete
            await job.updateProgress(100);

            return {
                key: fileKey,
                url: fileUrl,
                originalSize: size,
                compressedSize,
                savingsPercent: `${savingsPercent}%`,
                format: "webp",
            };
        } finally {
            // Always cleanup the temporary uploaded file, even if errors occurred
            try {
                await fs.unlink(tempPath);
            } catch (cleanupError) {
                console.warn(`Could not delete temp file ${tempPath}:`, cleanupError.message);
            }
        }
    },
    {
        connection: redisConfig,
        concurrency: 2, // Process up to 2 images concurrently
    }
);

// Worker Lifecycle Logging
imageWorker.on("completed", (job, returnvalue) => {
    console.log(`[Worker] Job ${job.id} completed successfully! Savings: ${returnvalue.savingsPercent}`);
});

imageWorker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
});

module.exports = imageWorker;
