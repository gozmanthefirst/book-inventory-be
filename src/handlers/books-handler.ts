// External Imports
import type { Handler } from "hono";
import { StatusCodes } from "http-status-codes";

// Local Imports
import { deleteOrphanedAuthors } from "../lib/db/authors.js";
import {
  createNewBookForUserQ,
  deleteBookByIdForUserQ,
  deleteBookByIdQ,
  getAllBooksForUserQ,
  getAllBooksQ,
  getBookByIdForUserQ,
  getBookByIdQ,
  getBookByIsbnForUserQ,
  updateBookReadStatusForUserQ,
} from "../lib/db/books.js";
import { deleteOrphanedGenres } from "../lib/db/genres.js";
import { getUserByIdQ } from "../lib/db/user.js";
import { errorResponse, successResponse } from "../lib/utils/api-response.js";
import { isValidPastDate } from "../lib/utils/datetime.js";
import { removeDashesAndSpaces } from "../lib/utils/string.js";

//* Get all books
export const getAllBooks: Handler = async (c) => {
  try {
    const books = await getAllBooksQ();
    return c.json(
      successResponse("Books successfully retrieved.", books),
      StatusCodes.OK,
    );
  } catch (error) {
    console.error("Error retrieving books:", error);
    return c.json(
      errorResponse("INTERNAL_SERVER_ERROR", "Error retrieving books."),
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

//* Get single book
export const getSingleBook: Handler = async (c) => {
  try {
    const bookId = c.req.param("bookId");

    const book = await getBookByIdQ(bookId);

    // Return an error if the book was not found
    if (!book) {
      return c.json(
        errorResponse("NOT_FOUND", "Book not found."),
        StatusCodes.NOT_FOUND,
      );
    }

    return c.json(
      successResponse("Book successfully retrieved.", book),
      StatusCodes.OK,
    );
  } catch (error) {
    console.error("Error retrieving book:", error);
    return c.json(
      errorResponse("INTERNAL_SERVER_ERROR", "Error retrieving book."),
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

//* Delete single book
export const deleteSingleBook: Handler = async (c) => {
  try {
    const bookId = c.req.param("bookId");

    const book = await getBookByIdQ(bookId);

    // Return an error if the book was not found
    if (!book) {
      return c.json(
        errorResponse("NOT_FOUND", "Book not found."),
        StatusCodes.NOT_FOUND,
      );
    }

    // Delete book
    await deleteBookByIdQ(book.id);

    // Delete authors and genres if they no longer have a connected book
    await deleteOrphanedAuthors();
    await deleteOrphanedGenres();

    return c.json(
      successResponse("Book successfully deleted."),
      StatusCodes.OK,
    );
  } catch (error) {
    console.error("Error deleting book:", error);
    return c.json(
      errorResponse("INTERNAL_SERVER_ERROR", "Error deleting book."),
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

//* Get all books for user
export const getAllBooksForUser: Handler = async (c) => {
  try {
    const userId = c.req.param("userId");

    const user = await getUserByIdQ(userId);

    // Return an error if the user was not found
    if (!user) {
      return c.json(
        errorResponse("NOT_FOUND", "User not found."),
        StatusCodes.NOT_FOUND,
      );
    }

    const books = await getAllBooksForUserQ(user.id);

    return c.json(
      successResponse("User's books successfully retrieved.", books),
      StatusCodes.OK,
    );
  } catch (error) {
    console.error("Error retrieving books for user:", error);
    return c.json(
      errorResponse(
        "INTERNAL_SERVER_ERROR",
        "Error retrieving books for user.",
      ),
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

//* Create new book
export const createNewBookForUser: Handler = async (c) => {
  try {
    const userId = c.req.param("userId");

    const user = await getUserByIdQ(userId);

    // Return an error if the user was not found
    if (!user) {
      return c.json(
        errorResponse("NOT_FOUND", "User not found."),
        StatusCodes.NOT_FOUND,
      );
    }

    const {
      title,
      subtitle,
      bookDesc,
      imageUrl,
      isbn,
      publisher,
      publishedDate,
      pageCount,
      readStatus,
      authors,
      genres,
    } = await c.req.json();

    //! Required Fields
    // Check if values exist for the required fields
    const requiredFields = [
      { name: "Title", value: title },
      { name: "Page Count", value: pageCount },
      { name: "Author(s)", value: authors },
      { name: "Genre(s)", value: genres },
      { name: "Read Status", value: readStatus },
    ];

    for (const field of requiredFields) {
      if (!field.value) {
        return c.json(
          errorResponse("INVALID_DATA", [`${field.name} is required.`]),
          StatusCodes.BAD_REQUEST,
        );
      }
    }

    //! Title
    if (typeof title !== "string" || title.length < 1) {
      return c.json(
        errorResponse("INVALID_DATA", ["Title can not be blank."]),
        StatusCodes.BAD_REQUEST,
      );
    }

    //! ISBN
    // Return error if isbn is a boolean
    if (typeof isbn === "boolean") {
      return c.json(
        errorResponse("INVALID_DATA", ["Invalid ISBN."]),
        StatusCodes.BAD_REQUEST,
      );
    }

    // This formatting is necessary incase the ISBN is in the form of groups of numbers separated by dashes.
    const modifiedIsbn = removeDashesAndSpaces(String(isbn));

    if (modifiedIsbn.length !== 13 && modifiedIsbn.length !== 10) {
      return c.json(
        errorResponse("INVALID_DATA", ["Invalid ISBN."]),
        StatusCodes.BAD_REQUEST,
      );
    }

    let isIsbnValid = false;

    // ISBN-10: 10 chars, first 9 are digits, last can be digit or 'X'
    if (modifiedIsbn.length === 10) {
      isIsbnValid = /^\d{9}[\dXx]$/.test(modifiedIsbn);
    }

    // ISBN-13: 13 digits only
    if (modifiedIsbn.length === 13) {
      isIsbnValid = /^\d{13}$/.test(modifiedIsbn);
    }

    if (!isIsbnValid) {
      return c.json(
        errorResponse("INVALID_DATA", ["ISBN contains invalid characters."]),
        StatusCodes.BAD_REQUEST,
      );
    }

    // Check if a book already has that ISBN
    const existingIsbn = await getBookByIsbnForUserQ(modifiedIsbn, userId);

    if (existingIsbn) {
      return c.json(
        errorResponse(
          "ISBN_ALREADY_EXIST",
          "Book with this ISBN already exists.",
        ),
        StatusCodes.CONFLICT,
      );
    }

    //! Published Date
    // Check published date validity
    const validPubdate = isValidPastDate(publishedDate);

    if (!validPubdate) {
      return c.json(
        errorResponse("INVALID_DATA", ["Invalid publication year."]),
        StatusCodes.BAD_REQUEST,
      );
    }

    //! Page Count
    if (isNaN(Number(pageCount)) || Number(pageCount) <= 0) {
      return c.json(
        errorResponse("INVALID_DATA", ["Invalid page count."]),
        StatusCodes.BAD_REQUEST,
      );
    }

    //! Read Status
    if (
      typeof readStatus !== "string" ||
      !["unread", "read", "reading"].includes(readStatus.toLowerCase())
    ) {
      return c.json(
        errorResponse("INVALID_DATA", ["Invalid read status."]),
        StatusCodes.BAD_REQUEST,
      );
    }

    //! Authors
    // Check if authors is an array
    if (!Array.isArray(authors)) {
      return c.json(
        errorResponse("INVALID_DATA", ["Authors must be an array."]),
        StatusCodes.BAD_REQUEST,
      );
    }

    // Check if authors array contains authors
    if (authors.length === 0) {
      return c.json(
        errorResponse("INVALID_DATA", ["Authors array cannot be empty."]),
        StatusCodes.BAD_REQUEST,
      );
    }

    // Check if each author is a valid string
    for (let i = 0; i < authors.length; i++) {
      const author = authors[i];
      if (typeof author !== "string") {
        return c.json(
          errorResponse("INVALID_DATA", [
            "Each Author must be a valid string.",
          ]),
          StatusCodes.BAD_REQUEST,
        );
      }
      if (typeof author === "string" && author.length === 0) {
        return c.json(
          errorResponse("INVALID_DATA", ["Author cannot be an empty string."]),
          StatusCodes.BAD_REQUEST,
        );
      }

      authors[i] = author;
    }

    //! Genres
    // Check if genres is an array
    if (!Array.isArray(genres)) {
      return c.json(
        errorResponse("INVALID_DATA", ["Genres must be an array."]),
        StatusCodes.BAD_REQUEST,
      );
    }

    // Check if genres array contains genres
    if (genres.length === 0) {
      return c.json(
        errorResponse("INVALID_DATA", ["Genres array cannot be empty."]),
        StatusCodes.BAD_REQUEST,
      );
    }

    // Check if each genre is a valid string
    for (let i = 0; i < genres.length; i++) {
      const genre = genres[i];
      if (typeof genre !== "string") {
        return c.json(
          errorResponse("INVALID_DATA", ["Each Genre must be a valid string."]),
          StatusCodes.BAD_REQUEST,
        );
      }
      if (typeof genre === "string" && genre.length === 0) {
        return c.json(
          errorResponse("INVALID_DATA", ["Genre cannot be an empty string."]),
          StatusCodes.BAD_REQUEST,
        );
      }

      genres[i] = genre;
    }

    // Optional fields
    const finalSubtitle = subtitle ? subtitle : "";
    const finalBookDesc = bookDesc ? bookDesc : "";
    const finalImageUrl = imageUrl ? imageUrl : "";
    const finalPubDate = new Date(publishedDate);

    //! Create book and return book ID
    await createNewBookForUserQ({
      title,
      subtitle: finalSubtitle,
      bookDesc: finalBookDesc,
      imageUrl: finalImageUrl,
      isbn: modifiedIsbn,
      publisher,
      publishedDate: finalPubDate,
      pageCount,
      readStatus,
      authors,
      genres,
      userId,
    });

    return c.json(
      successResponse("User's book successfully created."),
      StatusCodes.CREATED,
    );
  } catch (error) {
    console.error("Error creating book for user:", error);
    return c.json(
      errorResponse("INTERNAL_SERVER_ERROR", "Error creating book for user."),
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

//* Get single book for user
export const getSingleBookForUser: Handler = async (c) => {
  try {
    const userId = c.req.param("userId");
    const bookId = c.req.param("bookId");

    const user = await getUserByIdQ(userId);

    // Return an error if the user was not found
    if (!user) {
      return c.json(
        errorResponse("NOT_FOUND", ["User not found."]),
        StatusCodes.NOT_FOUND,
      );
    }

    const book = await getBookByIdForUserQ(bookId, user.id);

    // Return an error if the book was not found
    if (!book) {
      return c.json(
        errorResponse("NOT_FOUND", ["Book not found."]),
        StatusCodes.NOT_FOUND,
      );
    }

    return c.json(
      successResponse("User's book successfully retrieved.", book),
      StatusCodes.OK,
    );
  } catch (error) {
    console.error("Error retrieving books for user:", error);
    return c.json(
      errorResponse(
        "INTERNAL_SERVER_ERROR",
        "Error retrieving books for user.",
      ),
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

//* Update single book for user
export const updateBookReadStatusForUser: Handler = async (c) => {
  try {
    const userId = c.req.param("userId");
    const bookId = c.req.param("bookId");

    const user = await getUserByIdQ(userId);

    // Return an error if the user was not found
    if (!user) {
      return c.json(
        errorResponse("NOT_FOUND", ["User not found."]),
        StatusCodes.NOT_FOUND,
      );
    }

    const book = await getBookByIdQ(bookId);

    // Return an error if the book was not found
    if (!book) {
      return c.json(
        errorResponse("NOT_FOUND", ["Book not found."]),
        StatusCodes.NOT_FOUND,
      );
    }

    const { readStatus } = await c.req.json();

    //! Required Fields
    // Check if values exist for the required fields
    const requiredFields = [{ name: "Read Status", value: readStatus }];

    for (const field of requiredFields) {
      if (!field.value) {
        return c.json(
          errorResponse("INVALID_DATA", [`${field.name} is required.`]),
          StatusCodes.BAD_REQUEST,
        );
      }
    }

    // Update book
    await updateBookReadStatusForUserQ(book.id, user.id, readStatus);

    // Delete authors and genres if they no longer have a connected book
    await deleteOrphanedAuthors();
    await deleteOrphanedGenres();

    return c.json(
      successResponse("User's book successfully updated."),
      StatusCodes.OK,
    );
  } catch (error) {
    console.error("Error updating user's book:", error);
    return c.json(
      errorResponse("INTERNAL_SERVER_ERROR", "Error updating user's book."),
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

//* Delete single book for user
export const deleteSingleBookForUser: Handler = async (c) => {
  try {
    const userId = c.req.param("userId");
    const bookId = c.req.param("bookId");

    const user = await getUserByIdQ(userId);

    // Return an error if the user was not found
    if (!user) {
      return c.json(
        errorResponse("NOT_FOUND", ["User not found."]),
        StatusCodes.NOT_FOUND,
      );
    }

    const book = await getBookByIdQ(bookId);

    // Return an error if the book was not found
    if (!book) {
      return c.json(
        errorResponse("NOT_FOUND", ["Book not found."]),
        StatusCodes.NOT_FOUND,
      );
    }

    // Delete book
    await deleteBookByIdForUserQ(book.id, user.id);

    // Delete authors and genres if they no longer have a connected book
    await deleteOrphanedAuthors();
    await deleteOrphanedGenres();

    return c.json(
      successResponse("User's book successfully deleted."),
      StatusCodes.OK,
    );
  } catch (error) {
    console.error("Error deleting user's book:", error);
    return c.json(
      errorResponse("INTERNAL_SERVER_ERROR", "Error deleting user's book."),
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};
