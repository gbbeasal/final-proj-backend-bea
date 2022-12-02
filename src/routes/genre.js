// import express from "express"
// import pick from "lodash/pick.js"
// import { body, validationResult } from "express-validator"

// const genreRouter = express.Router();

// // ============== GET /genres ==============:
// genreRouter.get("/genres", async (request, response) => {
//     const genres = await request.app.locals.prisma.genre.findMany()
//     response.send({genres: genres})
// })

// // ============== GET /genres/:genreId ==============:
// genreRouter.get("/genres/:genreId", async (request, response) => {
//     const genreId = request.params.genreId
//     const genres = await request.app.locals.prisma.genre.findUnique({
//         where: {
//             id: Number.parseInt(genreId)
//         }
//     })
//     response.send({genre: genres})
// })

// // ============== GET /genres/:genreId/books ==============:
// genreRouter.get("/genres/:genreId/books", async (request, response) => {
//     const genreId = parseInt(request.params.genreId)
//     const genres = await request.app.locals.prisma.genre.findUnique({
//         where: {
//             id: Number.parseInt(genreId)
//         },
//         include: {
//             books: true
//         }
//     })

//     const books = genres.books.map( ( {book} ) => book)
//       if (books.length === 0){
//         response.send( {books: books, message: "There are no books under this genre"})
//       }
//       response.send( { books: genres.books, message: "ok"})
// })

// // ============ PUT /genres/:genreId ============:
// genreRouter.put("/genres/:genreId", async (request, response) => {
//     const genreId = request.params.genreId
//     // response.send({data:request.body.title, message:"ok"})

//     const filteredBody = pick(request.body, ["title"])

//     const updatedGenre = await request.app.locals.prisma.genre.update({
//         where: {
//             id: Number.parseInt(genreId),
//           },
//         data: filteredBody,
//       })
//     response.send({ updatedGennre: updatedGenre, message: "Genre update successful" })
// })

// // ============== POST /genres ==============:
// genreRouter.post(
//     "/genres", 
//     //validation help from express-validators (inside an array)
//     [
//         body('title')
//             .notEmpty()
//             .isLength({min: 3}) // title length restriction
//             .withMessage("Book requires a `firstName` and should be more than 5 characters long")
//     ], 
//     async (request, response) => {

//         const errors = validationResult(request);
//         // if may laman si error, we send a reponse containing all the errors
//         if (!errors.isEmpty()) {
//             response.status(400).json({ errors: errors.array() })
//             return;
//         }

//         const filteredBody = pick(request.body, ["title"])

//         // response.send({ data: filteredBody, message: "ok"})
//         const genre = await request.app.locals.prisma.genre.create({
//         data: filteredBody,
//         })
//         // response.send({ data: filteredBody, message: "book added successfully" })
//         response.send({ newGenre: genre, message: "Genre added successfully" })
// })

// // ============== DELETE /genres/:genreId ==============:
// genreRouter.delete("/genres/:genreId", async (request, response) => {
//     const genreId = parseInt(request.params.genreId);
//     try {
//         const deletedGenre = await request.app.locals.prisma.genre.delete({
//             where: {
//                 id: Number.parseInt(genreId),
//             },
//         });
//         response.send({ deletedGenre: deletedGenre, message: deletedGenre? "ok":"Genre not found" })
//     } catch {
//         response.send({ data: null, message: "genre not found" })
//     }
// })

// export default genreRouter;