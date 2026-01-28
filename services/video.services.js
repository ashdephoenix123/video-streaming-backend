const HTTP_ERRORS = require("../constants");
const Video = require("../models/VideoModel");
const { cloudinary } = require("../config/cloudinary");

const fetchVideos = async ({ page, limit }) => {
  const videos = await Video.find()
    .populate("userId", "username avatarURL")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  if (!videos) {
    const err = new Error("Error fetching videos.");
    err.statusCode = HTTP_ERRORS.BAD_REQUEST;
    throw err;
  }

  return videos;
};

const getVideo = async ({ slug }) => {
  const video = await Video.find({ slug }).populate(
    "userId",
    "username avatarURL",
  );

  if (!video) {
    const err = new Error("Not found!");
    err.statusCode = HTTP_ERRORS.NOT_FOUND;
    throw err;
  }

  return video[0];
};

const processAndSaveVideo = async ({
  filename,
  userId,
  title,
  description,
}) => {
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
    const err = new Error("Video Upload Failed.");
    err.statusCode = 400;
    throw err;
  }

  res.json({
    url: hlsUrl,
    title,
    description,
    publicId: filename,
  });
};

module.exports = { fetchVideos, getVideo, processAndSaveVideo };
