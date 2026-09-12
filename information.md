# FlixStream System Architecture & Tech Stack

An overview of the architecture, data flow, infrastructure, and proposed enhancements for **FlixStream**.

---

## 🏛️ Architecture Overview

| Layer | Technology | Primary Role |
| :--- | :--- | :--- |
| **Frontend** | React, React Native, Next.js, TypeScript | Multi-platform client interface |
| **Backend API** | Node.js, Express, TypeScript | Gateway, auth, metadata, queue dispatch |
| **Message Queue** | BullMQ + Redis | Asynchronous job dispatching & buffering |
| **Background Worker** | Node.js Worker + FFmpeg | HLS video transcoding & thumbnail generation |
| **Edge & CDN** | Cloudflare | Global edge caching (.ts chunks) & WAF/DDoS protection |
| **Object Storage** | Cloudflare R2 | Zero-egress storage for video files, HLS streams, & assets |
| **Primary Database** | PostgreSQL + PgBouncer | Relational data persistence with connection pooling |
| **In-Memory Cache** | Redis | Rate limiting, query caching, queue store |
| **Containerization** | Docker & Docker Compose | Uniform dev/prod environment & orchestration |
| **Auto-scaling** | Google Cloud Run | Serverless container scaling (scale-to-zero) |
| **Observability** | Sentry + Pino | Error tracking & high-performance structured logging |

---

## ⚙️ Core Architecture Components

### 1. Frontend
- **Tech Stack:** React, React Native, Next.js, TypeScript
- **Responsibilities:**
  - Responsive web & cross-platform mobile experiences.
  - Media playback using HLS-compatible video players.
  - Server-side rendering (SSR) and SEO optimization with Next.js.

---

### 2. Backend API
- **Tech Stack:** Node.js, Express, TypeScript
- **Core Entry:** Gateway in `index.js`
- **Responsibilities:**
  - **Authentication & User Management:** JWT / HTTP-only cookies, user profiles, like/subscribe logic, watch history tracking.
  - **Video Ingestion:** Accepts video upload requests, stores video metadata in the database.
  - **Queue Dispatch:** Dispatches transcoding jobs to the queue. When a user uploads a video (e.g., 1 GB), the API pushes `{ videoId, rawFileUrl }` to BullMQ and responds immediately with `202 Accepted` to ensure the API never blocks or freezes.

---

### 3. Message Broker / Queue
- **Tech Stack:** BullMQ (backed by Redis)
- **Role:** Shock absorber between API endpoints and heavy processing tasks.
- **Workflow:**
  - Buffers high-volume upload requests.
  - Decouples client HTTP request/response lifecycles from long-running background tasks.
  - Guarantees job retries, concurrency limits, and failure handling.

---

### 4. Background Worker
- **Tech Stack:** Node.js Worker Process + FFmpeg
- **Deployment:** Runs in a separate container from the API.
- **Responsibilities:**
  - Listens to the BullMQ queue and pulls pending video jobs.
  - Executes FFmpeg to transcode raw `.mp4` uploads into multi-bitrate HLS adaptive streams (`1080p`, `720p`, `480p`, master `.m3u8` playlists + `.ts` chunk files).
  - Extracts video thumbnails at designated timestamps.
  - Updates the database video status from `processing` to `ready`.

---

### 5. Edge & CDN
- **Tech Stack:** Cloudflare
- **Responsibilities:**
  - **Global Caching:** Sits in front of your domain and object storage to cache small `.ts` video chunks across hundreds of edge data centers worldwide. When thousands of users watch the same video, Cloudflare serves chunks directly from edge RAM, querying the origin server only once.
  - **DDoS & WAF Protection:** Drops malicious traffic and brute-force login attempts (e.g. 100k req/min targeting `api.flixstream.com`) at the edge before hitting origin servers, keeping compute bills predictable.

> [!NOTE]
> **Media Delivery Rule:** Always serve video files and static media via Cloudflare CDN edge, never directly through the Node.js application server.

---

### 6. Object Storage
- **Tech Stack:** Cloudflare R2
- **Responsibilities:**
  - Stores raw master video uploads, generated HLS playlists (`.m3u8`), segment chunks (`.ts`), and user avatars.
  - **Zero Egress Advantage:** Unlike AWS S3, Cloudflare R2 features **$0 egress fees**, preventing massive bandwidth charges when streaming petabytes of video data.

---

### 7. Primary Database
- **Tech Stack:** PostgreSQL
- **Connection Management:** PgBouncer built-in connection pooling
- **Responsibilities:**
  - Persists relational data (users, videos, playlists, subscriptions, comments, view counts).
  - PgBouncer prevents connection exhaustion during sudden spikes in concurrent API requests.

---

### 8. In-Memory Cache
- **Tech Stack:** Redis
- **Use Cases:**
  - **Rate Limiting:** Protects endpoints from upload spam, brute-force logins, and abuse.
  - **Query Caching:** Caches high-frequency read endpoints (e.g., trending feed, subscriber counts) with a 60-second TTL to keep database load near zero.
  - **Queue Backend:** High-speed data store backing BullMQ.

---

### 9. Containerization & Local Development
- **Tech Stack:** Docker & Docker Compose
- **Features:**
  - Encapsulates API, Worker, Node.js runtime, and system dependencies (like FFmpeg) into standardized, immutable images.
  - `docker-compose.yml` provides a one-command local environment (`docker compose up`) orchestrating the Node API, Worker, Redis, and PostgreSQL without requiring local service installations on Windows.

---

### 10. Auto-Scaling & Cloud Hosting
- **Tech Stack:** Google Cloud Run
- **Capabilities:**
  - Runs containerized microservices in production.
  - **Traffic Spikes:** Automatically scales horizontally (e.g., 20–50 parallel container instances) during peak demand.
  - **Idle Periods:** Automatically downsizes to `0` (or `1` warm instance), reducing compute expenses to near `$0/hour` during off-peak hours (e.g., late night).

---

### 11. Observability & Logging
- **Tech Stack:** Sentry + Pino
- **Capabilities:**
  - **Sentry:** Real-time unhandled exception catching and transcoding crash detection with stack traces, file names, and line numbers.
  - **Pino:** Fast, structured JSON logging to monitor request latencies, throughput, and error rates per endpoint.

---

## 🚀 Recommended Additions & Future Enhancements

### 1. Full-Text Search Engine (Meilisearch or Typesense / Elasticsearch)
- **The Problem:** Relational databases using `WHERE title ILIKE '%spider man%'` suffer from slow sequential table scans, poor scalability, and cannot handle spelling mistakes (e.g., `"spidr man"`), relevance ranking, or instant type-ahead suggestions.
- **The Solution:** Sync video titles, tags, and creator metadata to Meilisearch or Typesense. Delivers typo-tolerant, ranked search responses in under **15ms**.

---

### 2. Real-Time Communication (WebSockets / SSE)
- **The Problem:** HTTP is client-driven. To check if a video has finished transcoding, clients must continuously poll (`GET /status` every 2 seconds), generating wasteful traffic and latency.
- **The Solution:** Establish persistent connections via WebSockets or Server-Sent Events (SSE) to push server updates instantly:
  - Live video transcoding progress indicators (e.g. *"45% transcoded..."*).
  - Real-time subscriber counters and notifications.
  - Interactive live stream chat.

---

### 3. Automated CI/CD Pipeline (GitHub Actions)
- **The Problem:** Manually testing, building Docker images, and deploying from a local machine is time-consuming, prone to human error, and lacks auditability.
- **The Solution:** Automate the pipeline with GitHub Actions on `git push origin main`:
  - Run automated unit/integration tests and linters.
  - Build and optimize production Docker container images.
  - Deploy verified builds directly to Google Cloud Run / cloud hosting with zero manual intervention.

---

### 4. Type-Safe End-to-End API Layer (tRPC or GraphQL)
- **The Problem:** In standard REST Express setups, renaming a field (e.g., `avatarURL` to `profilePic`) won't be caught by the frontend until runtime crashes occur in the browser.
- **The Solution:** When both frontend and backend share TypeScript, **tRPC** allows the Next.js frontend to import route types directly with zero code-generation overhead. Renaming or modifying backend payloads immediately triggers TypeScript compile-time errors in the frontend editor.

---

## 🌐 Deployment Routing Architecture (Vercel + Render + Cloudflare)

When hosting frontend on **Vercel** and backend on **Render.io**, Cloudflare acts as the **Reverse Proxy and Global Front Door**:

```
                              [ User Browser / Mobile App ]
                                            │
                                            ▼
                           [ Cloudflare (DNS & Edge Proxy) ]
                                            │
        ┌───────────────────────────────────┼───────────────────────────────────┐
        ▼                                   ▼                                   ▼
 [ flixstream.com ]             [ api.flixstream.com ]              [ media.flixstream.com ]
  Vercel (Next.js)                 Render.io (Express)                 Cloudflare R2 Bucket
 (Web Application)               (REST API / Auth / DB)               (Video Chunks & Playlists)
```

### Key Benefits of this Routing Setup:
1. **Zero Bandwidth Bills for Videos:** Video streaming traffic never touches Render.io. Video segments (`.ts`, `.m3u8`) stream directly from **Cloudflare R2** via `media.flixstream.com` over Cloudflare's free CDN edge.
2. **Origin Protection:** Cloudflare drops DDoS floods and malicious bots before they reach Render.io, preventing accidental server billing spikes.
3. **Cold-Start Mitigation:** Cloudflare caches frequent read-only `GET` responses at edge nodes, shielding users from Render's spin-up delays on lower-tier plans.

---

## 🔄 Video Upload, Handover & Concurrency Lifecycle

### 1. Two-Phase Progress Tracking
Uploading and processing large video files (e.g., 1 GB) consists of two completely separate phases:

| Phase | Description | How Progress is Tracked |
| :--- | :--- | :--- |
| **Phase 1: Network Upload** | Transferring 1 GB from client device to storage. | Client-side tracking via Axios / XHR `onUploadProgress` (0% ➔ 100%). |
| **Phase 2: Video Transcoding** | Worker running FFmpeg to convert `.mp4` into multi-bitrate HLS. | FFmpeg `.on('progress')` ➔ Redis Pub/Sub ➔ Socket.io ➔ Client UI bar. |

### 2. Real-Time Notification & Progress Flow:
1. **Upload Complete:** Client finishes upload; API returns `202 Accepted` with `{ videoId, status: "processing" }`.
2. **Live Socket Room:** Client connects to WebSocket and joins `video_{id}` room.
3. **FFmpeg Emits Progress:** Worker listens to FFmpeg frame progression, updating BullMQ (`job.updateProgress(percent)`) and publishing updates to Redis Pub/Sub.
4. **Relay to Client:** Express API receives Redis events and forwards them over Socket.io to the frontend progress bar.
5. **Completion / Background Alert:**
   - **In-App:** When status hits `ready`, Socket.io pushes a completion event and the user is redirected to the video player.
   - **Tab Closed / Device Locked:** The worker triggers **Firebase Cloud Messaging (FCM) / Expo Push Notifications** or an email (Resend) alerting the user that their video is live.

### 3. The Handover Process (Pointers, Not Heavy Files)
- **Never put a 1 GB file into a message queue:** Redis and BullMQ are strictly designed for lightweight JSON metadata (a few bytes).
- **The "Coat Check" Model:**
  1. The API receives the video and writes the raw file to disk or Cloudflare R2 (`raw_videos/video_123.mp4`).
  2. The API creates a lightweight JSON ticket: `{ videoId: "123", rawFileUrl: "..." }` and enqueues it in BullMQ.
  3. **Pull Model:** The worker does not get force-fed by the queue; the worker **pulls** jobs from Redis only when it has available CPU capacity.

### 4. Concurrency: What Happens When 100 Users Upload Simultaneously?
- **At the API Layer:** Node.js runs on a **Single-Threaded Event Loop**. It does *not* create 100 OS threads. Using asynchronous non-blocking I/O (`epoll`), it handles 100 incoming network streams concurrently on a single thread with minimal RAM overhead.
- **At the Worker Layer (Controlled Concurrency):**
  - Running 100 FFmpeg processes at once would melt the CPU (1000% load) and crash the server with an Out Of Memory (OOM) error.
  - BullMQ prevents this with **controlled concurrency** (e.g., `concurrency: 2`):
    - Jobs 1 & 2 start transcoding immediately.
    - Jobs 3 through 100 wait safely in Redis consuming near-zero CPU/RAM.
    - As soon as Job 1 finishes, Job 3 is pulled automatically.

---

## 🧠 Systems & DevOps Deep-Dive

### 1. Node.js vs. Express API
- **Node.js (The Engine):** A JavaScript runtime built on Chrome's V8 engine allowing JS to execute server-side with direct access to file systems, network sockets, and OS system calls. Single-threaded event loop.
- **Express.js (The Car):** A lightweight web framework running *inside* Node.js. It abstracts Node's low-level `http.createServer` stream-chunking plumbing into clean routing (`app.get`), middleware chains, and JSON helpers (`res.json()`).

### 2. What a Docker Container ACTUALLY Is
- **A container is NOT a server.**
- A container is simply an **isolated OS process running inside a server**.
- **The Apartment Analogy:**
  - **The Server (Hardware & Linux OS):** The apartment building providing shared water, power, and foundation (CPU, RAM, Linux kernel).
  - **The Docker Container:** An individual locked apartment. It has its own private furniture, doors, and rooms (file system, Node.js version, libraries, ports), but shares the building's underlying utilities.
- **Containers vs. Virtual Machines:** VMs boot an entire guest operating system (takes 2–5 minutes, 1–2 GB RAM idle). Containers share the host kernel, starting in **under 1 second** with virtually zero idle overhead.

### 3. What "Cloud Run Spins Up 26 Containers" Means During a Flash Sale
- When 5,000 concurrent users hit the site, Google does not buy 26 computers.
- Google launches **26 parallel copies of your Express API process (`node index.js`)** wrapped in Docker containers across available servers in their data center.
- A built-in **Load Balancer** sits in front of all 26 copies, distributing incoming HTTP requests evenly like cards dealt from a deck.
- **Why this is necessary:** Because Node.js is single-threaded, 1 copy can only utilize 1 CPU core. Running 26 copies allows the app to harness 26 CPU cores simultaneously.
- **When the sale ends:** Cloud Run deletes the 25 idle copies. Compute costs drop back to near $0.
- **The Stateless Rule:** Code must never store user sessions in local server RAM (`let users = []`). All state must live in **Redis** or **PostgreSQL** so any of the 26 copies can fulfill any user request seamlessly.

### 4. Google Cloud Run vs. Kubernetes (Why K8s Exists)
If Cloud Run provides auto-scaling and serverless containers, why do enterprise companies use Kubernetes?

| Dimension | Google Cloud Run | Kubernetes (EKS / GKE / Bare Metal) |
| :--- | :--- | :--- |
| **Operational Overhead** | Near zero (Google manages everything). | High (requires cluster maintenance, upgrades, ingress config). |
| **Cost at Massive Scale** | Expensive at continuous high throughput (Serverless per-request tax). | Highly cost-efficient (packs containers tightly onto cheap bare-metal hardware). |
| **Portability / Lock-In** | Proprietary to Google Cloud. | 100% open-source; identical YAML runs on AWS, Azure, Google, or on-premise. |
| **Workload Types** | HTTP requests and short-lived jobs (max 60 min). | Anything: long-running daemons, stateful databases, continuous WebSocket servers, GPU clusters. |
| **Internal Networking** | Public/private HTTPS endpoints. | Rich overlay networks (ClusterIP, service mesh, mTLS, internal low-latency DNS). |

> **Takeaway:** Use **Cloud Run / Render** for solo projects, MVPs, and startups scaling to millions of requests. Transition to **Kubernetes** when managing multi-team microservices, specialized GPU clusters, or multi-cloud enterprise deployments.

---

## 📦 tRPC Architecture: Monorepo vs. Separate Repos

| Setup | How it Works | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **Monorepo (Turborepo / pnpm)** *(Recommended)* | Frontend and backend live in one Git repo. Frontend imports types directly: `import type { AppRouter } from '../api'`. | • Instant compile-time error feedback in editor.<br>• Zero bundle bloat (type-only import).<br>• Zero build/publish step. | Single repository management. |
| **Separate Repositories** | Backend exports `.d.ts` declaration files and publishes to private registry (`@flixstream/api-types`). Frontend runs `npm install`. | Repositories remain physically decoupled. | • High workflow friction.<br>• Must commit, build, and publish an npm package for every API schema change.<br>• Risk of version mismatch between frontend and backend. |

> [!TIP]
> If you must keep frontend and backend in separate repositories without a monorepo, standard **REST with Zod validation + OpenAPI (Swagger) generators** (e.g. Orval / openapi-typescript) is generally easier to maintain than multi-repo tRPC.

