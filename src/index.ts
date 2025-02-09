// External Imports
import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import { Hono } from "hono";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// Local Imports
import { errorHandler } from "@/middlewares/error-handler.js";
import { notFoundRoute } from "@/middlewares/not-found-route.js";
import booksRouter from "@/routes/books-route.js";
import authorsRouter from "./routes/authors-route.js";
import genresRouter from "./routes/genres-route.js";

dotenv.config();

const app = new Hono({ strict: false });

// CORS Middleware
app.use(
  "/api/*",
  cors({
    origin: ["https://books.gozman.dev", "http:localhost:3000"],
    credentials: true,
  }),
);

// Compression Middleware
app.use(compress());

// Logger Middleware
app.use(logger());

// Testing API
app.get("/", (c) => {
  return c.text("API is running successfully!");
});

// Routes
app.route("/api/v1/books", booksRouter);
app.route("/api/v1/authors", authorsRouter);
app.route("/api/v1/genres", genresRouter);

// Not Found Routes and Error Handler Middleware
app.notFound(notFoundRoute);
app.onError(errorHandler);

const port = Number(process.env.PORT || 8000);
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
