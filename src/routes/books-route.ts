// External Imports
import { Hono } from "hono";

// Local Imports
import {
  createNewBookForUser,
  deleteSingleBookForUser,
  getAllBooksForUser,
  getSingleBook,
  getSingleBookForUser,
} from "../handlers/books-handler";
import { deleteSingleBook, getAllBooks } from "../handlers/books-handler.js";

const booksRouter = new Hono({ strict: false });

// Get all books - GET {/api/v1/books}/
booksRouter.get("/", getAllBooks);

// Get single book - GET {/api/v1/books}/:bookId
booksRouter.get("/:bookId", getSingleBook);

// Delete single book - DELETE {/api/v1/books}/:bookId
booksRouter.delete("/:bookId", deleteSingleBook);

// Get all books for user - GET {/api/v1/books}/user/:userId
booksRouter.get("/user/:userId", getAllBooksForUser);

// Create book for user - POST {/api/v1/books}/user/:userId
booksRouter.post("/user/:userId", createNewBookForUser);

// Get single book for user - GET {/api/v1/books}/user/:userId/:bookId
booksRouter.get("/user/:userId/:bookId", getSingleBookForUser);

// Delete single book for user - DELETE {/api/v1/books}/user/:userId/:bookId
booksRouter.delete("/user/:userId/:bookId", deleteSingleBookForUser);

export default booksRouter;
