const fs = require("fs");
const path = require("path");
const Video = require("../models/VideoModel");

// @desc Get Videos
// @route /api/videos
// @access public

const { upload, cloudinary } = require("../config/cloudinary");
const asyncHandler = require("express-async-handler");

const getVideos = (req, res) => {
  const streamsPath =
    "C:\\Projects\\tests\\video-streaming-app\\backend\\streams";
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
};

// @desc Get single Videos
// @route /api/video/:slug
// @access public

const getVideo = asyncHandler(async (req, res) => {
  const slug = req.params.slug;
  const video = await Video.find({ slug });
  console.log(111, video);
  if (!video) {
    res.status(404);
    throw new Error("Not found!");
  }
  res.status(200).json(video[0]);
});

// @desc POST video
// @route /api/upload
// @access public

const uploadVideo = (req, res) => {
  upload.single("video")(req, res, async function (err) {
    if (err) {
      return res.status(500).json({ error: err.message || "Upload failed" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file received" });
    }

    const { title, description, userId } = req.body;
    const { filename } = req.file;

    try {
      await cloudinary.uploader.explicit(filename, {
        resource_type: "video",
        type: "upload",
        eager: [
          {
            streaming_profile: "full_hd",
            format: "m3u8",
          },
        ],
      });

      const hlsUrl = `https://res.cloudinary.com/${process.env.CLD_NAME}/video/upload/sp_full_hd/${filename}.m3u8`;

      const vidData = {
        userId,
        title,
        description,
        hlsUrl,
        publicId: filename,
      };
      const video = await Video.create(vidData);
      if (!video) {
        res.status(400);
        throw new Error("Video Upload Failed.");
      }

      res.json({
        url: hlsUrl,
        title,
        description,
        publicId: filename,
      });
    } catch (e) {
      console.error("❌ HLS generation error:", e);
      res.status(500).json({ error: "HLS generation failed" });
    }
  });
};

module.exports = { getVideos, getVideo, uploadVideo };
