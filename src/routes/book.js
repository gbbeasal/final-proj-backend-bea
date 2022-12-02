import express from "express"
import pick from "lodash/pick.js"
import { body, validationResult } from "express-validator"

const booksRouter = express.Router();

// booksRouter.get("/books/test", (request, response) => {
//     response.send({message: "test is working"})
// })

// ============ GETTING ALL BOOKS ============:
// async bc we are waiting for a response
// to test: GET http://localhost:4000/books
booksRouter.get("/books", async (request, response) => {
    const books = await request.app.locals.prisma.book.findMany()
    // response.send({ data: [], message: "ok" })
    response.send({ books: books, message: books ? "ok" : "no books found" })
})

// ============ GETTING A SPECIFIC BOOK VIA ID ============:
// to test: GET http://localhost:4000/books/4
booksRouter.get("/books/:bookId", async (request, response) => {
    const bookId = request.params.bookId;
    // const bookId = parseInt(request.params.bookId);
    // need to parseInt the bookId kase string sya eh yung const books need na Int yung id.
    const book = await request.app.locals.prisma.book.findUnique({
        where: {
          id: Number.parseInt(bookId),
        },
      })
    //console.log(books)
    response.send({ book: book, message: book ? "ok" : "book not found" })
})

// ============ GETTING A SPECIFIC BOOK'S AUTHOR VIA ID ============:
// returns just the author's info based on the book's ID
// shows how to return relationships
// to test: GET http://localhost:4000/books/4/author
booksRouter.get("/books/:bookId/author", async (request, response) => {
    const bookId = request.params.bookId;
    // The following query returns all books with the matching bookId
    // and includes each books's author in the result:
    const book = await request.app.locals.prisma.book.findUnique({
        where: {
          id: Number.parseInt(bookId),
        },
        include: {
            author: true
      }})

    // HOWEVER, when you enter a book that doesnt exist, the app crashes
    // says if book is null, ito gagawin:
    if (!book){
        response.send({ data: null, message: "book not found" })
    } else {
        // response.send({ data: book, message: "ok" })
        response.send({ data: book.author, message: "ok" })
    }    
})

// ============ ADDING A BOOK ============:
// optional middleware:
// better if more than 1 route, good ang middleware
// function filterBody(request, response, next){
//     // filter logic
// }
// better alt: express-validators library (npm install express-validator)
// lets us to do validation on inputs we get without manually writing it ourselves

// booksRouter.post("/books", filterBody, async (request, response) => {}
// edited to include the genreId dapat na array containing the ids a book has
booksRouter.post(
    "/books", 
    //validation help from express-validators (inside an array)
    [
        body('title')
            .notEmpty()
            .isLength({min: 5}) // title length restriction
            .withMessage("Book requires a `title` and should be more than 5 characters long"),
        body('pages')
            .notEmpty()
            .withMessage("Book must contain `pages`"),
    ], 
    async (request, response) => {

        const errors = validationResult(request);
        // if may laman si error, we send a reponse containing all the errors
        if (!errors.isEmpty()) {
            response.status(400).json({ errors: errors.array() })
            return;
        }

        //const body = request.body;
        // console.log(body)
        // console.log(body.title)

        // para itong keys in the array lang yung masesend further on
        // returns a json
        const filteredBody = pick(request.body, [
            "title",
            "subtitle",
            "published", 
            "publisher",
            "pages",
            "description",
            "website",
            "authorId",
        ])

        // if may nakalagay na genreId, connect it between Book and Genre
        if (request.body.genreIds) {
            const genres = request.body.genreIds.map((genreId) => ({
              genre: {
                connect: {
                  id: Number.parseInt(genreId),
                },
              },
            }));
            filteredBody.genres = {
              create: genres,
            };
          }

        // response.send({ data: filteredBody, message: "ok"})
        const book = await request.app.locals.prisma.book.create({
        data: filteredBody,
        })
        // response.send({ data: filteredBody, message: "book added successfully" })
        response.send({ newBook: book, message: "book added successfully" })


    // use lodash to avoid using this:
    // const book = await request.app.locals.prisma.book.create({
    //     data: {
    //         title: body.title,
    //         subtitle: body.subtitle,
    //         published: body.published,
    //         publisher: body.publisher,
    //         pages: body.pages,
    //         description: body.description,
    //         website: body.website,
    //         authorId: body.authorId
    //      },
    //   })
    // response.send({ data: book, message: "book added successfully" })
})

// ============ UPDATING A BOOK ============:
// updates a resource
booksRouter.put("/books/:bookId", async (request, response) => {
    const bookId = request.params.bookId
    // response.send({data:request.body.title, message:"ok"})

    const filteredBody = pick(request.body, [
        "title",
        "subtitle",
        "published", 
        "publisher",
        "pages",
        "description",
        "website",
        "authorId"
    ])

    const updatedBook = await request.app.locals.prisma.book.update({
        where: {
            id: Number.parseInt(bookId),
          },
        data: filteredBody,
      })
    response.send({ updatedBook: updatedBook, message: "ok" })
})

// ============ DELETING A BOOK ============:
// booksRouter.delete("/books/:bookId", async (request, response) => {
//     const bookId = parseInt(request.params.bookId);
//     const book = await request.app.locals.prisma.book.findUnique({
//         where: {
//           id: Number.parseInt(bookId),
//         },
//       })

//     if (!book) {
//         response.send({ message: "book does not exist" })
//     }  
//     const deletedBook = await request.app.locals.prisma.book.delete({
//         where: {
//             id: Number.parseInt(bookId),
//         },
//       })
//       response.send({ data: deletedBook, message: "resource successfully deleted" })
// })

// OR SIR'S WAY (shorter no need to find unique):
booksRouter.delete("/books/:bookId", async (request, response) => {
    const bookId = parseInt(request.params.bookId);
    try {
        const deletedBook = await request.app.locals.prisma.book.delete({
            where: {
                id: Number.parseInt(bookId),
            },
        });
        response.send({ deletedBook: deletedBook, message: deletedBook? "ok":"book not found" })
    } catch {
        response.send({ data: null, message: "book not found" })
    }
})


// ============ EXTRA: MANY TO MANY RELATIONSHIPS ============:
// GET /books/:bookId/genres <-- returns all genres of a book
booksRouter.get("/books/:bookId/genres", async (request, response) => {
    const bookId = request.params.bookId;
    // The following query returns all books with the matching bookId
    // and includes each books's genres in the result:
    const book = await request.app.locals.prisma.book.findUnique({
        where: {
          id: Number.parseInt(bookId),
        },

        // Pag genres:true, ang nirereturn is the actual BookGenres na record. 
        // include: {
        //     genres:true
        //   },
        // If we want to return the reference to the genre, need nung nested include.
        include: {
            genres: {
                include: {
                    genre:true,
                }
            },
          },
      })

    const genres = book.genres.map( ( {genre} ) => genre)
    // since genres is an array of objs and within that obj we have a key
    // called genre, ipupull out lang natin yung genre na yun and yun yung 
    // ibabalik natin

    // console.log(genres.length)
      if (genres.length === 0){
        response.send( {genres: genres, message: "this book doesnt have any genres specified"})
      }
      response.send( { genres: genres, message: "ok"})
})



export default booksRouter;