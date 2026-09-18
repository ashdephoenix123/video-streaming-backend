# Image Processing & R2 Upload Pipeline - Test Cases & API Documentation

This document contains test cases, request payloads, expected responses, and testing procedures for the background image compression and Cloudflare R2 upload pipeline.

---

## 1. Environment & Prerequisites Checklist

Ensure the following dependencies are running before testing:

| Component | Status Check Command | Expected Output |
| :--- | :--- | :--- |
| **Docker Redis** | `docker ps` | `redis-local` container running on `0.0.0.0:6379->6379/tcp` |
| **Backend Server** | `npm run dev` | `Backend running on http://localhost:5000` & `WORKER INITIALIZED` |
| **Cloudflare R2** | In `.env` | `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_PUBLIC_URL` |

---

## 2. API Endpoints Overview

| Method | Endpoint | Description | Content-Type |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/images/upload` | Uploads single raw image, enqueues BullMQ compression job | `multipart/form-data` |
| `GET` | `/api/images/status/:jobId` | Polls job processing progress, status, and R2 result URL | N/A |

---

## 3. Test Cases

### TC-01: Happy Path - Single Image Upload & Job Enqueue
* **Goal:** Verify that a valid image is accepted, saved temporarily to `./uploads/temp`, and enqueued to BullMQ without blocking the HTTP request.
* **Method:** `POST`
* **URL:** `http://localhost:5000/api/images/upload`
* **Headers:**
  ```http
  Accept: application/json
  ```
* **Body (`multipart/form-data`):**
  | Key | Type | Value | Description |
  | :--- | :--- | :--- | :--- |
  | `image` | `File` | `<path_to_image.jpg>` | Valid JPEG, PNG, or WebP file (< 15MB) |

#### Expected Response:
* **HTTP Status:** `202 Accepted`
* **Response Body:**
  ```json
  {
    "success": true,
    "message": "Image uploaded. Compression & upload started in background.",
    "jobId": "1",
    "file": {
      "originalName": "sample-photo.jpg",
      "size": 2128896
    }
  }
  ```

#### Background Worker Activity (Console Output):
```text
[Worker] Job 1 completed successfully! Savings: 88.45%
```

---

### TC-02: Happy Path - Check Job Processing Status & Result
* **Goal:** Retrieve current processing status, progress percentage, compression savings, and the public Cloudflare R2 URL.
* **Method:** `GET`
* **URL:** `http://localhost:5000/api/images/status/1` *(Replace `1` with the `jobId` returned from TC-01)*
* **Headers:** None
* **Body:** None

#### Expected Response (When Completed):
* **HTTP Status:** `200 OK`
* **Response Body:**
  ```json
  {
    "jobId": "1",
    "state": "completed",
    "progress": 100,
    "result": {
      "key": "images/1726661234567-sample_photo.webp",
      "url": "https://pub-xxxxxxxxxxxxxx.r2.dev/images/1726661234567-sample_photo.webp",
      "originalSize": 2128896,
      "compressedSize": 245812,
      "savingsPercent": "88.45%",
      "format": "webp"
    },
    "failedReason": null
  }
  ```

#### Expected Response (If Polled While Processing):
* **HTTP Status:** `200 OK`
* **Response Body:**
  ```json
  {
    "jobId": "1",
    "state": "active",
    "progress": 40,
    "result": null,
    "failedReason": null
  }
  ```

---

### TC-03: Visual Quality Comparison (High vs Heavy Compression)
* **Goal:** Verify that adjusting Sharp compression parameters in `workers/imageWorker.js` reduces file size and alters image quality noticeably.

| Setting in `workers/imageWorker.js` | Quality Rating | Typical Size Reduction | Visual Difference |
| :--- | :--- | :--- | :--- |
| `.webp({ quality: 80, effort: 4 })` | High / Production | 60% – 80% | Indistinguishable from original |
| `.webp({ quality: 30, effort: 4 })` | Medium | 80% – 90% | Slight softening of sharp edges |
| `.webp({ quality: 10, effort: 4 })` | Aggressive / Low | 90% – 96% | Visible blockiness, soft blur, color banding |
| `.resize({ width: 400 }).webp({ quality: 15 })` | Extreme Downscale | 95% – 99% | Highly pixelated / small thumbnail |

#### Verification:
1. Upload the same source image with `quality: 10`.
2. Grab the resulting `url` from the status API.
3. Open the original image and the compressed WebP URL side-by-side in your browser.

---

### TC-04: Validation - Missing File Field
* **Goal:** Verify that requests without an uploaded file or with the wrong field name are rejected immediately.
* **Method:** `POST`
* **URL:** `http://localhost:5000/api/images/upload`
* **Body (`multipart/form-data`):** Empty, or field key named `photo` instead of `image`.

#### Expected Response:
* **HTTP Status:** `400 Bad Request`
* **Response Body:**
  ```json
  {
    "error": "Please upload an image file (field name: 'image')."
  }
  ```

---

### TC-05: Validation - Unsupported File Extension / MIME Type
* **Goal:** Verify that non-image files (e.g., `.pdf`, `.txt`, `.mp4`, `.exe`) are rejected by the Multer `fileFilter`.
* **Method:** `POST`
* **URL:** `http://localhost:5000/api/images/upload`
* **Body (`multipart/form-data`):**
  | Key | Type | Value |
  | :--- | :--- | :--- |
  | `image` | `File` | `document.pdf` |

#### Expected Response:
* **HTTP Status:** `500 Internal Server Error` *(caught by global error handler)*
* **Response Body:**
  ```json
  {
    "title": "Internal Server Error",
    "message": "Invalid file type (application/pdf). Only JPEG, PNG, and WebP are allowed."
  }
  ```

---

### TC-06: Validation - File Size Exceeds Limit (> 15 MB)
* **Goal:** Verify that files larger than 15MB are rejected by Multer limits.
* **Method:** `POST`
* **URL:** `http://localhost:5000/api/images/upload`
* **Body (`multipart/form-data`):** An image file larger than 15 MB.

#### Expected Response:
* **HTTP Status:** `500 Internal Server Error`
* **Response Body:**
  ```json
  {
    "title": "Internal Server Error",
    "message": "File too large"
  }
  ```

---

### TC-07: Edge Case - Querying Non-Existent Job ID
* **Goal:** Verify that querying an invalid or non-existent job ID returns a 404.
* **Method:** `GET`
* **URL:** `http://localhost:5000/api/images/status/99999999`

#### Expected Response:
* **HTTP Status:** `404 Not Found`
* **Response Body:**
  ```json
  {
    "error": "Job not found or expired."
  }
  ```

---

### TC-08: Resource Cleanup Verification
* **Goal:** Ensure temporary files on disk (`uploads/temp`) are deleted after worker processing, preventing server disk leaks.

#### Verification Steps:
1. Note the contents of `d:\Akash\personal-stuffs\video-streaming-backend\uploads\temp`.
2. Upload an image via `POST /api/images/upload`.
3. Wait for the `[Worker] Job completed` log in the console.
4. Check `uploads/temp` again:
   * **Expected Result:** The uploaded raw file has been deleted automatically by the `finally` block in `imageWorker.js`.

---

## 4. Ready-to-Run cURL Commands

### Upload Image (PowerShell / Windows):
```powershell
curl.exe -X POST "http://localhost:5000/api/images/upload" `
  -F "image=@C:\path\to\your\photo.jpg"
```

### Upload Image (Bash / macOS / Linux):
```bash
curl -X POST "http://localhost:5000/api/images/upload" \
  -F "image=@/path/to/your/photo.jpg"
```

### Check Job Status:
```bash
curl -X GET "http://localhost:5000/api/images/status/1"
```
