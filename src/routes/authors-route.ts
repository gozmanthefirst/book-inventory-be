// External Imports
import { Hono } from "hono";

// Local Imports
import { getAllAuthors } from "@/handlers/authors-handler.js";

const authorsRouter = new Hono({ strict: false });

// Get all authors - GET {/api/v1/authors}/
authorsRouter.get("/", getAllAuthors);

export default authorsRouter;
