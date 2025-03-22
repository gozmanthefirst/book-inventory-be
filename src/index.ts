import { Hono } from "hono";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { serve } from "@hono/node-server";

import { env } from "./config/env.js";
import { authMiddleware } from "./middleware/auth-middleware.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundRoute } from "./middleware/not-found-route.js";
import auth from "./routes/auth-route.js";
import authors from "./routes/authors-route.js";
import books from "./routes/books-route.js";
import genres from "./routes/genres-route.js";
import user from "./routes/user-route.js";

import "./types.js";

// Initialize app
const app = new Hono({ strict: false });

// Enable CORS
app.use(
  "*",
  cors({
    origin: ["https://books.gozman.dev", "http://localhost:3000"],
    credentials: true,
    maxAge: 3600,
  }),
);

// CSRF Protection
app.use(
  csrf({
    origin: ["https://books.gozman.dev", "http://localhost:3000"],
  }),
);

// Security Headers
app.use(
  "*",
  secureHeaders({
    xFrameOptions: "DENY",
    xXssProtection: "1",
    strictTransportSecurity:
      env.NODE_ENV === "production"
        ? "max-age=31536000; includeSubDomains"
        : false,
    referrerPolicy: "strict-origin-when-cross-origin",
  }),
);

// Enable compression and route logging
app.use(compress());
app.use(logger());

// Healthcheck
app.get("/", (c) => c.text("API is up and running!"));

// Public routes
app.route("/api/v1/auth", auth);

app.use(authMiddleware);

// Protected Routes
app.route("/api/v1/user", user);
app.route("/api/v1/books", books);
app.route("/api/v1/authors", authors);
app.route("/api/v1/genres", genres);

// Not Found & Error Handling Middleware
app.notFound(notFoundRoute);
app.onError(errorHandler);

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);

if (env.NODE_ENV === "development") {
  console.log(`mode: ${env.NODE_ENV}`);
}
