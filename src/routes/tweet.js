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
// if user they are looking for doesn't exist, it returns a prompt saying so

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

    if (user == null) {
      response.send({ data: null, message: 'Error - user does not exist' });
      return;
    }

    const filteredUser = pick(user, ['userName', 'bio']);
    response.send({
      user: filteredUser,
      message: filteredUser ? 'ok' : 'Error',
    });
  }
});

// ============ ADDING A BOOK ============:
// Authenticated User = can create their own tweet
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
      response
        .status(401)
        .send({ data: null, message: 'Invalid Request - Please login' });
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
      response
        .status(401)
        .send({ data: null, message: 'Invalid Request - Please try again' });
    }
  }
);

// ============ DELETING A TWEET BY ID ============:
// Authenticated User = can delete their own tweet via tweetId
// Unauthenticated/Invalid JWT Session User = will be prompted to login
// if the tweet doesn't belong to the current user, they cannot delete it

tweetRouter.delete('/tweets/:tweetId', async (request, response) => {
  const cookies = request.cookies;
  const jwtSession = cookies.sessionId;
  const tweetId = parseInt(request.params.tweetId);

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

    const tweet = await request.app.locals.prisma.tweet.findUnique({
      where: {
        id: tweetId,
      },
    });

    //console.log(tweet.userId)

    if (userId != tweet.userId) {
      response
        .status(401)
        .send({
          data: null,
          message:
            'Invalid Request - You are not authorized to delete this tweet',
        });
      return;
    }

    const deletedTweet = await request.app.locals.prisma.tweet.delete({
      where: {
        id: Number.parseInt(tweetId),
      },
    });
    response.send({
      deletedTweet: deletedTweet,
      message: deletedTweet ? 'Successfully deleted tweet' : 'Tweet not found',
    });
  } catch {
    response
      .status(401)
      .send({ data: null, message: 'Invalid Request - Please try again' });
  }
});

export default tweetRouter;
