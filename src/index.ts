// External Imports
import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import { Hono } from "hono";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// Local Imports
import { errorHandler } from "./middlewares/error-handler.js";
import { notFoundRoute } from "./middlewares/not-found-route.js";
import authorsRouter from "./routes/authors-route.js";
import booksRouter from "./routes/books-route.js";
import genresRouter from "./routes/genres-route.js";

dotenv.config();

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

// Enable compression and route logging
app.use(compress());
app.use(logger());

// Healthcheck
app.get("/", (c) => c.text("API is up and running!"));

// Routes
app.route("/api/v1/books", booksRouter);
app.route("/api/v1/authors", authorsRouter);
app.route("/api/v1/genres", genresRouter);

// Not Found & Error Handling Middleware
app.notFound(notFoundRoute);
app.onError(errorHandler);

const port = Number(process.env.PORT || 8000);
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
