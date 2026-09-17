# Express & Node.js Backend Guidelines & Pitfalls

A reference guide for developers working on the **FlixStream** backend. Follow these rules and architectural principles to prevent silent failures, hanging requests, and difficult-to-debug runtime issues.

---

## 🏛️ The Express Request Pipeline Order

Express processes requests and middleware in a **strict top-to-bottom order**. Every request must move through these layers in sequence:

```text
1. Global Pre-processors (CORS, Cookie Parser, JSON Body Parser)
         │
2. Route-Level Guards & Middleware (verifyToken, Multer uploaders)
         │
3. Route Handlers & Controllers (business logic in services)
         │
4. 404 Catch-All Handler (for unmatched endpoints)
         │
5. Global Error Handler (err, req, res, next) — ALWAYS LAST
```

---

## ⚠️ 10 Golden Rules to Prevent Head-Scratching Bugs

### 1. The Error Handler Must Always Be Registered Last
* **The Pitfall**: If `app.use(errorHandler)` is placed *before* your routes, Express will bypass it for any error thrown inside routes/controllers. Express only searches *forward* in the stack for error handlers. If none follow, it falls back to Express's default HTML error page.
* **The Rule**: Place `app.use(errorHandler)` at the very bottom of your application configuration, after all route definitions.

```javascript
// ✅ CORRECT ORDER in index.js
app.use(cookieParser());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api", videoRoutes);

// Error handling at the absolute end
app.use(errorHandler);
```

---

### 2. The 4-Argument Rule (Middleware Arity)
* **The Pitfall**: Express uses JavaScript's `Function.length` (parameter count) to detect error-handling middleware. If you omit `next` because you don't use it:
  ```javascript
  // ❌ BROKEN: Express treats this as normal middleware with 3 arguments!
  const errorHandler = (err, req, res) => { ... };
  ```
  Express will pass the `req` object into `err`, `res` into `req`, and `next` into `res`, breaking the application.
* **The Rule**: Error handlers **must always accept all 4 parameters**: `(err, req, res, next)`.

```javascript
// ✅ CORRECT
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    title: err.title || "Error",
    message: err.message,
    ...(process.env.NODE_ENV !== "production" ? { error: err.stack } : {}),
  });
};
```

---

### 3. Specific / Static Routes Before Dynamic (`:id`) Routes
* **The Pitfall**: Express matches routes from top to bottom. If a parameterized route appears first, it will capture subsequent static paths as parameter values.
  ```javascript
  // ❌ BROKEN
  router.get("/:id", getUser);            // Matches GET /api/user/history
  router.get("/history", getUserHistory); // NEVER REACHED! "history" is treated as :id
  ```
* **The Rule**: Always define specific, static endpoints **above** dynamic `:id` or wildcard `*` routes.

```javascript
// ✅ CORRECT
router.get("/history", getUserHistory);
router.get("/likedVideos", getLikedVideos);
router.get("/:id", getUser); // Catches remaining IDs at the bottom
```

---

### 4. `res.json()` Does NOT Stop Function Execution
* **The Pitfall**: Calling `res.json()` sends a response to the client, but the rest of the function continues executing. Subsequent calls to `res.json()` or database operations will trigger the notorious error:
  `Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client`.
* **The Rule**: Always `return` when sending a response inside conditional blocks.

```javascript
// ❌ WRONG
if (!user) {
  res.status(404).json({ message: "User not found" });
}
doSomethingWith(user.id); // Code continues! Causes crashes or header errors.

// ✅ CORRECT
if (!user) {
  return res.status(404).json({ message: "User not found" });
}
```

---

### 5. Express 4 Async Error Handling & Hanging Requests
* **The Pitfall**: In Express 4, if an `async` route handler or middleware throws an error without a `try/catch` or `asyncHandler`, the returned Promise rejects unhandled. Express never receives `next(err)`, causing the HTTP request to **hang indefinitely until browser timeout**.
* **The Rule**: Wrap every asynchronous route handler and middleware with `express-async-handler`.

```javascript
const asyncHandler = require("express-async-handler");

// ✅ Request properly forwards errors to central errorHandler
const getUser = asyncHandler(async (req, res) => {
  const user = await userServices.fetchUserDetails({ id: req.params.id });
  return res.status(200).json(user);
});
```

---

### 6. Parsers Must Precede Routes
* **The Pitfall**: Placing body/cookie parsers (`express.json()`, `cookieParser()`) after routes means `req.body` and `req.cookies` will be `undefined` when the route handlers run.
* **The Rule**: Register all parsers before mounting any routers.

---

### 7. Multipart Form-Data (Multer) and `req.body`
* **The Pitfall**: `express.json()` cannot read `multipart/form-data`. Any text fields (`req.body`) sent alongside uploaded files will be empty `{}` until Multer has processed the stream.
* **The Rule**: Never attempt to inspect or validate `req.body` in middleware placed **before** `upload.single()` or `upload.fields()`. Inspect `req.body` in or after the Multer callback.

---

### 8. Cross-Origin Cookie Requirements (`SameSite` & `Secure`)
When running frontend and backend across different ports or domains (`localhost:3000` vs `localhost:5000` or Vercel vs Render):
* `cors()` must specify explicit origins (`origin: "http://localhost:3000"`), never `origin: "*"`, when `credentials: true`.
* In modern browsers:
  - Setting `SameSite: "none"` requires `Secure: true` (HTTPS).
  - In local development over HTTP, setting `SameSite: "none"` will fail because HTTP cannot be `Secure`.
* **The Rule**: Use environment-aware cookie options:

```javascript
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 24 * 60 * 60 * 1000,
  path: "/",
};
```

---

### 9. Top-Level `await` in CommonJS & Async Server Startup
* **The Pitfall**: Node.js CommonJS files (`require` / `module.exports`) do not support top-level `await`. Writing `await startServer()` at the root level throws a `SyntaxError`.
* **The Rule**: Call `startServer()` directly, and chain `.catch()` to capture startup failures (such as `EADDRINUSE` port collisions or failed DB connections):

```javascript
// ✅ CORRECT in index.js
const startServer = async () => {
  await connectDB();
  // app.use(...)
  app.listen(port, () => console.log(`Server running on port ${port}`));
};

startServer().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
```

---

### 10. Always Await the Database Connection Before Listening
* **The Pitfall**: Calling `connectDB()` synchronously without `await` before `app.listen()` allows HTTP requests to arrive before the database connection pool is ready, causing initial requests to fail with `MongoNotConnectedError`.
* **The Rule**: `await connectDB()` before invoking `app.listen()`.

---

## 📁 Recommended Architectural Pattern

Maintain a strict separation of concerns across layers:

| Layer | Responsibility | Example Files |
| :--- | :--- | :--- |
| **Routes** | Define URL paths, HTTP verbs, and attach middleware | [userRoute.js](file:///d:/Personal/flixstream/video-streaming-backend/routes/userRoute.js) |
| **Middleware** | Intercept requests (Authentication, Validation, File Uploads) | [verifyToken.js](file:///d:/Personal/flixstream/video-streaming-backend/middleware/verifyToken.js) |
| **Controllers** | Extract `req.params`/`req.body`, call services, return status/JSON | [userController.js](file:///d:/Personal/flixstream/video-streaming-backend/controller/userController.js) |
| **Services** | Core business logic, queries, external APIs, hashing | [user.services.js](file:///d:/Personal/flixstream/video-streaming-backend/services/user.services.js) |
| **Models** | Mongoose schemas and data persistence | [UserModel.js](file:///d:/Personal/flixstream/video-streaming-backend/models/UserModel.js) |
| **Errors** | Unified error class and catch-all error responder | [ApiError.js](file:///d:/Personal/flixstream/video-streaming-backend/utils/ApiError.js), [errorHandler.js](file:///d:/Personal/flixstream/video-streaming-backend/middleware/errorHandler.js) |
