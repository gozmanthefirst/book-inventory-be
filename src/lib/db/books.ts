// Local Imports
import db from "./prisma.js";

export const getAllBooksQ = async () => {
  const books = await db.book.findMany({
    include: {
      authors: true,
      genres: true,
    },
  });
  return books;
};

export const createNewBookQ = async ({
  title,
  subtitle,
  bookDesc,
  imageUrl,
  isbn,
  publisher,
  publishedDate,
  pageCount,
  authors,
  genres,
}: {
  title: string;
  subtitle?: string;
  bookDesc?: string;
  imageUrl?: string;
  isbn?: string;
  publisher?: string;
  publishedDate?: Date;
  pageCount: number;
  authors: string[];
  genres: string[];
}) => {
  await db.book.create({
    data: {
      title,
      subtitle,
      bookDesc,
      imageUrl,
      isbn,
      publisher,
      publishedDate,
      pageCount,
      authors: {
        connectOrCreate: authors.map((name) => ({
          where: { authorName: name },
          create: { authorName: name },
        })),
      },
      genres: {
        connectOrCreate: genres.map((name) => ({
          where: { genreName: name },
          create: { genreName: name },
        })),
      },
    },
  });
};

export const getBookByIdQ = async (id: string) => {
  const book = await db.book.findUnique({
    where: {
      id,
    },
    include: {
      authors: true,
      genres: true,
    },
  });
  return book;
};

export const getBookByIsbnQ = async (isbn: string) => {
  const book = await db.book.findUnique({
    where: {
      isbn,
    },
    include: {
      authors: true,
      genres: true,
    },
  });
  return book;
};

export const deleteBookByIdQ = async (id: string) => {
  await db.book.delete({
    where: {
      id,
    },
  });
};
