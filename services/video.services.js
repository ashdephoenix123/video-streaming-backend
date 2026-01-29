const HTTP_ERRORS = require("../constants");
const Video = require("../models/VideoModel");
const { cloudinary } = require("../config/cloudinary");
const ApiError = require("../utils/ApiError");

const fetchVideos = async ({ page, limit }) => {
  const videos = await Video.find()
    .populate("userId", "username avatarURL")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  if (!videos) {
    throw new ApiError(HTTP_ERRORS.BAD_REQUEST, "Error fetching videos.");
  }

  return videos;
};

const getVideo = async ({ slug }) => {
  const video = await Video.find({ slug }).populate(
    "userId",
    "username avatarURL",
  );

  if (!video) {
    throw new ApiError(HTTP_ERRORS.NOT_FOUND, "Not found!");
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
    throw new ApiError(HTTP_ERRORS.BAD_REQUEST, "Video Upload Failed.");
  }

  res.json({
    url: hlsUrl,
    title,
    description,
    publicId: filename,
  });
};

module.exports = { fetchVideos, getVideo, processAndSaveVideo };
