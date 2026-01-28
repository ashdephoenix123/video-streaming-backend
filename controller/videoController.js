const fs = require("fs");
const path = require("path");
const Video = require("../models/VideoModel");
const videoServices = require("../services/video.services");
const { upload, cloudinary } = require("../config/cloudinary");
const asyncHandler = require("express-async-handler");
const HTTP_ERRORS = require("../constants");

// Test
const isitworking = asyncHandler(async (req, res) => {
  res.status(200).json({ message: "Yes, It is Working!" });
});

// @desc Get Videos
// @route /api/videos
// @access public

const getVideos = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const result = await videoServices.fetchVideos({ page, limit });
  res.status(200).json(result);
});

// @desc Get single Videos
// @route /api/video/:slug
// @access public

const getVideo = asyncHandler(async (req, res) => {
  const slug = req.params.slug;
  const result = await videoServices.getVideo({ slug });
  res.status(200).json(result);
});

// @desc POST video
// @route /api/upload
// @access public

const uploadVideo = asyncHandler((req, res) => {
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
      const result = await videoServices.processAndSaveVideo({
        filename,
        userId,
        title,
        description,
      });
      res.status(201).json(result);
    } catch (e) {
      console.error("❌ HLS generation error:", e);
      res
        .status(HTTP_ERRORS.INTERNAL_SERVER_ERROR)
        .json({ error: "HLS generation failed" });
    }
  });
});

module.exports = { isitworking, getVideos, getVideo, uploadVideo };
