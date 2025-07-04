require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const { upload, cloudinary } = require("./config/cloudinary");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use("/streams", express.static(path.join(__dirname, "streams")));

const hasAudioStream = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const hasAudio = metadata.streams.some((s) => s.codec_type === "audio");
      resolve(hasAudio);
    });
  });
};

app.get("/videos/:slug", (req, res) => {
  const slug = req.params.slug;
  const videoPath = path.join(__dirname, "streams", slug, "master.m3u8");

  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ error: "Video not found" });
  }
  res.json({ url: `/streams/${req.params.slug}/master.m3u8` });
});

app.get("/videos", (req, res) => {
  const streamsPath = path.join(__dirname, "streams");

  if (!fs.existsSync(streamsPath)) {
    return res.json([]);
  }

  const videos = fs.readdirSync(streamsPath).filter((folder) => {
    const masterPath = path.join(streamsPath, folder, "master.m3u8");
    return fs.existsSync(masterPath);
  });

  // Return URLs
  const videoUrls = videos.map((slug) => ({
    slug,
    url: `/streams/${slug}/master.m3u8`,
  }));

  res.json(videoUrls);
});

app.post("/upload", (req, res) => {
  upload.single("video")(req, res, async function (err) {
    if (err) {
      return res.status(500).json({ error: err.message || "Upload failed" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file received" });
    }

    const { title, description } = req.body;
    const { filename } = req.file;

    try {
      await cloudinary.uploader.explicit(filename, {
        resource_type: "video",
        type: "upload",
        eager: [
          {
            streaming_profile: "auto", // or "auto"
            format: "m3u8",
          },
        ],
      });

      const hlsUrl = `https://res.cloudinary.com/${process.env.CLD_NAME}/video/upload/sp_full_hd/${filename}.m3u8`;

      res.json({
        url: hlsUrl,
        title,
        description,
      });
    } catch (e) {
      console.error("❌ HLS generation error:", e);
      res.status(500).json({ error: "HLS generation failed" });
    }
  });
});

app.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`)
);
