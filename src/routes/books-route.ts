// External Imports
import { Hono } from "hono";

// Local Imports
import {
  createNewBook,
  deleteSingleBook,
  getAllBooks,
  getSingleBook,
} from "../handlers/books-handler.js";

const booksRouter = new Hono({ strict: false });

// Get all books - GET {/api/v1/books}/
// Create a new book - POST {/api/v1/books}/
booksRouter.get("/", getAllBooks).post(createNewBook);

// Get a single book - GET {/api/v1/books}/:id
booksRouter.get("/:id", getSingleBook).delete(deleteSingleBook);

export default booksRouter;
