// External Imports
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { StatusCodes } from "http-status-codes";

// Local Imports
import { errorHandler } from "./middlewares/error-handler.js";
import { notFoundRoute } from "./middlewares/not-found-route.js";

// Local Imports

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.notFound(notFoundRoute);
app.onError(errorHandler);

const port = 8000;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
