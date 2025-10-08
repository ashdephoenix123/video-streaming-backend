const express = require("express");
const {
  getVideos,
  getVideo,
  uploadVideo,
  isitworking,
} = require("../controller/videoController");
const router = express.Router();

router.get("/isitworking", isitworking);
router.get("/videos", getVideos);
router.get("/video/:slug", getVideo);
router.post("/upload", uploadVideo);

module.exports = router;
