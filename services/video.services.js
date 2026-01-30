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
  videoFileName,
  thumbnailFileName,
  userId,
  title,
  description,
}) => {
  await cloudinary.uploader.explicit(videoFileName, {
    resource_type: "video",
    type: "upload",
    eager: [
      {
        streaming_profile: "full_hd",
        format: "m3u8",
      },
    ],
  });

  const hlsUrl = `https://res.cloudinary.com/${process.env.CLD_NAME}/video/upload/sp_full_hd/${videoFileName}.m3u8`;
  const thumbnailUrl = `https://res.cloudinary.com/${process.env.CLD_NAME}/image/upload/${thumbnailFileName}`;

  const vidData = {
    userId,
    title,
    description,
    hlsUrl,
    thumbnailUrl,
    publicId: videoFileName,
  };
  const video = await Video.create(vidData);
  if (!video) {
    throw new ApiError(HTTP_ERRORS.BAD_REQUEST, "Video Upload Failed.");
  }

  return {
    url: hlsUrl,
    thumbnailUrl,
    title,
    description,
    publicId: videoFileName,
  };
};

module.exports = { fetchVideos, getVideo, processAndSaveVideo };
