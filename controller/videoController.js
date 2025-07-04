const fs = require("fs");
const path = require("path");

// @desc Get Videos
// @route /api/videos
// @access public

const { upload, cloudinary } = require("../config/cloudinary");

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
// @route /api/video
// @access public

const getVideo = (req, res) => {
  const slug = req.params.slug;
  const videoPath = path.join(
    "C:\\Projects\\tests\\video-streaming-app\\backend\\streams",
    slug,
    "master.m3u8"
  );

  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ error: "Video not found" });
  }
  res.json({ url: `/streams/${req.params.slug}/master.m3u8` });
};

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

    const { title, description } = req.body;
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
};

module.exports = { getVideos, getVideo, uploadVideo };
