const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use("/streams", express.static(path.join(__dirname, "streams")));

// Video upload config
const upload = multer({ dest: "uploads/" });

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

app.post("/upload", upload.single("video"), async (req, res) => {
  const inputPath = req.file.path;

  // 🧠 Create a slug from original filename
  const originalName = path.parse(req.file.originalname).name;
  const videoSlug = originalName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // 📁 Set output HLS directory
  const outputDir = path.join(__dirname, "streams", videoSlug);

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  try {
    const hasAudio = await hasAudioStream(inputPath);

    const mapAudio = hasAudio
      ? `-map a:0? -c:a:0 aac -map a:0? -c:a:1 aac -map a:0? -c:a:2 aac`
      : "";

    const varStreamMap = hasAudio
      ? `"v:0,a:0 v:1,a:1 v:2,a:2"`
      : `"v:0 v:1 v:2"`;

    const ffmpegCmd = `ffmpeg -i "${inputPath}" \
-filter_complex "[0:v]split=3[v1][v2][v3]; \
[v1]scale=w=426:h=240[v1out]; \
[v2]scale=w=640:h=360[v2out]; \
[v3]scale=w=1280:h=720[v3out]" \
-map "[v1out]" -c:v:0 libx264 -b:v:0 400k ${mapAudio.split(" ")[0] || ""} \
-map "[v2out]" -c:v:1 libx264 -b:v:1 800k ${mapAudio.split(" ")[2] || ""} \
-map "[v3out]" -c:v:2 libx264 -b:v:2 1500k ${mapAudio.split(" ")[4] || ""} \
-f hls -hls_time 10 -hls_playlist_type vod \
-var_stream_map ${varStreamMap} \
-master_pl_name master.m3u8 \
-hls_segment_filename "${outputDir}/v%v/index%d.ts" \
"${outputDir}/v%v/index.m3u8"`;

    exec(ffmpegCmd, (err, stdout, stderr) => {
      // fs.unlinkSync(inputPath); // optional cleanup
      if (err) {
        console.error("FFmpeg error:", stderr);
        return res.status(500).json({ error: stderr });
      }
      console.log("url: ", `/streams/${videoSlug}/master.m3u8`);
      res.json({ url: `/streams/${videoSlug}/master.m3u8` });
    });
  } catch (err) {
    console.error("Error probing file:", err);
    res.status(500).json({ error: "Failed to analyze video file." });
  }
});

app.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`)
);
