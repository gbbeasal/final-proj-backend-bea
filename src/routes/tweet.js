import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';

const tweetRouter = express.Router();

// ============ GETTING ALL TWEETS ============:
tweetRouter.get('/tweets', async (request, response) => {
  const tweets = await request.app.locals.prisma.tweet.findMany();
  response.send({ tweets: tweets, message: tweets ? 'ok' : 'no tweets found' });
});

// // ============ GETTING A SPECIFIC BOOK VIA ID ============:
// // to test: GET http://localhost:4000/books/4
// tweetRouter.get("/books/:bookId", async (request, response) => {
//     const bookId = request.params.bookId;
//     // const bookId = parseInt(request.params.bookId);
//     // need to parseInt the bookId kase string sya eh yung const books need na Int yung id.
//     const book = await request.app.locals.prisma.book.findUnique({
//         where: {
//           id: Number.parseInt(bookId),
//         },
//       })
//     //console.log(books)
//     response.send({ book: book, message: book ? "ok" : "book not found" })
// })

// // ============ GETTING A SPECIFIC BOOK'S AUTHOR VIA ID ============:
// // returns just the author's info based on the book's ID
// // shows how to return relationships
// // to test: GET http://localhost:4000/books/4/author
// tweetRouter.get("/books/:bookId/author", async (request, response) => {
//     const bookId = request.params.bookId;
//     // The following query returns all books with the matching bookId
//     // and includes each books's author in the result:
//     const book = await request.app.locals.prisma.book.findUnique({
//         where: {
//           id: Number.parseInt(bookId),
//         },
//         include: {
//             author: true
//       }})

//     // HOWEVER, when you enter a book that doesnt exist, the app crashes
//     // says if book is null, ito gagawin:
//     if (!book){
//         response.send({ data: null, message: "book not found" })
//     } else {
//         // response.send({ data: book, message: "ok" })
//         response.send({ data: book.author, message: "ok" })
//     }
// })

// ============ ADDING A BOOK ============:
tweetRouter.post(
  '/tweets',
  [body('content').notEmpty().isLength({ max: 280 }).withMessage('Tweets must have 1-280 characters')],
  async (request, response) => {
    const cookies = request.cookies;
    const jwtSession = cookies.sessionId;

    if (!jwtSession) {
      response.status(401).send({ data: null, message: 'Not Authenticated' });
      return;
    }

    const errors = validationResult(request);
    if (!errors.isEmpty()) {
      response.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const jwtSessionObject = await jwt.verify(
        jwtSession,
        process.env.JWT_SECRET
      );
      const userId = jwtSessionObject.uid;

      const tweets = await request.app.locals.prisma.tweet.create({
        data: {
          content: request.body.content,
          likes: 0,
          userId: userId,
        },
      });

      response.send({
        tweet: tweets,
        message: tweets
          ? 'Tweet successfully posted'
          : 'No tweets available',
      });
    } catch {
      response.status(401).send({
        data: null,
        message: 'Tweet Unsuccessful',
      });
    }
  }
);

// ============ DELETING A TWEET BY ID ============:
tweetRouter.delete("/tweets/:tweetId", async (request, response) => {
    const tweetId = parseInt(request.params.tweetId);
    try {
        const deletedTweet = await request.app.locals.prisma.tweet.delete({
            where: {
                id: Number.parseInt(tweetId),
            },
        });
        response.send({ deletedBook: deletedTweet, message: deletedTweet ? "ok":"Tweet not found" })
    } catch {
        response.send({ data: null, message: "Tweet not found" })
    }
})

export default tweetRouter;
