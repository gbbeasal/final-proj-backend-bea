import express from 'express';
import pick from 'lodash/pick.js';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';

const tweetRouter = express.Router();

// ============ GETTING ALL TWEETS ============:
// Authenticated User = can see their tweets
// Unauthenticated/Invalid JWT Session User = will be prompted to login

tweetRouter.get('/tweets', async (request, response) => {
  const cookies = request.cookies;
  const jwtSession = cookies.sessionId;

  if (!jwtSession) {
    response
      .status(401)
      .send({ data: null, message: 'Invalid Request - Please login' });
    return;
  }

  try {
    const jwtSessionObject = await jwt.verify(
      jwtSession,
      process.env.JWT_SECRET
    );
    const userId = jwtSessionObject.uid;
    const tweets = await request.app.locals.prisma.tweet.findMany({
      orderBy: {
        createdAt: 'asc',
      },
      where: { userId: userId },
    });
    response.send({
      tweets: tweets,
      message: tweets ? 'ok' : 'no tweets found',
    });
  } catch {
    response
      .status(401)
      .send({ data: null, message: 'Invalid Request - Please try again' });
  }
});

// ============== GET /tweets/:userName ==============:
// Authenticated User = can see tweets of the user they're looking at
// Unauthenticated/Invalid JWT Session User = can only see email and bio of the user they're looking at

tweetRouter.get('/tweets/:userName', async (request, response) => {
  const cookies = request.cookies;
  const jwtSession = cookies.sessionId;
  const userName = request.params.userName;
  // console.log(userName);

  // Checks if you have a JWT Session and implements logic accordingly
  if (!jwtSession) {
    const user = await request.app.locals.prisma.user.findUnique({
      where: { userName: userName },
    });
    const filteredUser = pick(user, ['userName', 'bio']);
    response.send({
      user: filteredUser,
      message: filteredUser ? 'ok' : 'error',
    });
    return;
  }

  try {
    await jwt.verify(jwtSession, process.env.JWT_SECRET);
    // gets user info of the username entered so we can find their userId
    const user = await request.app.locals.prisma.user.findUnique({
      where: { userName: userName },
    });

    const tweets = await request.app.locals.prisma.tweet.findMany({
      orderBy: {
        createdAt: 'asc',
      },
      where: { userId: user.id },
    });
    response.send({
      tweets: tweets,
      message: tweets ? 'ok' : 'no tweets found',
    });
  } catch {
    // response.status(401).send({ data: null, message: 'jwt is not valid' });
    const user = await request.app.locals.prisma.user.findUnique({
      where: { userName: userName },
    });
    const filteredUser = pick(user, ['userName', 'bio']);
    response.send({
      user: filteredUser,
      message: filteredUser ? 'ok' : 'error',
    });
  }
});


// ============ ADDING A BOOK ============:
// Authenticated User = can creat a tweet
// Unauthenticated/Invalid JWT Session User = will be prompted to login
tweetRouter.post(
  '/tweets',
  [
    body('content')
      .notEmpty()
      .isLength({ max: 280 })
      .withMessage('Tweets must have 1-280 characters'),
  ],
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
        message: tweets ? 'Tweet successfully posted' : 'No tweets available',
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
tweetRouter.delete('/tweets/:tweetId', async (request, response) => {
  const tweetId = parseInt(request.params.tweetId);
  try {
    const deletedTweet = await request.app.locals.prisma.tweet.delete({
      where: {
        id: Number.parseInt(tweetId),
      },
    });
    response.send({
      deletedBook: deletedTweet,
      message: deletedTweet ? 'ok' : 'Tweet not found',
    });
  } catch {
    response.send({ data: null, message: 'Tweet not found' });
  }
});

// ============ UPDATING A TWEET (LIKE) ============:
// tweetRouter.get('/tweets/:tweetId', async (request, response) => {
//   const tweetId = parseInt(request.params.tweetId);
//   console.log(tweetId)

//   // const filteredBody = pick(request.body, ['likes']);
//   // console.log(filteredBody)

//   // const updateLike = await request.app.locals.prisma.book.findUnique({
//   //   where: {
//   //     id: Number.parseInt(tweetId),
//   //   },
//   //   data: filteredBody,
//   // });
//   response.send({ data: null, message: 'ok' });
// });

export default tweetRouter;
