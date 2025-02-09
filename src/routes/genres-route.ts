// External Imports
import { Hono } from "hono";

// Local Imports
import { getAllGenres } from "@/handlers/genres-handler.js";

const genresRouter = new Hono({ strict: false });

// Get all genres - GET {/api/v1/genres}/
genresRouter.get("/", getAllGenres);

export default genresRouter;
