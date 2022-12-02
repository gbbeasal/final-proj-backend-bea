import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';

const tweetRouter = express.Router();

// ============ GETTING ALL TWEETS ============:
tweetRouter.get('/tweets', async (request, response) => {
  const cookies = request.cookies;
  const jwtSession = cookies.sessionId;

  if (!jwtSession) {
    response.status(401).send({ data: null, message: 'Not Authenticated' });
    return;
  }

  try {
    const jwtSessionObject = await jwt.verify(
      jwtSession,
      process.env.JWT_SECRET
    );
    const userId = jwtSessionObject.uid;
    const tweets = await request.app.locals.prisma.tweet.findMany({
      where: { userId: userId },
    });
    response.send({
      tweets: tweets,
      message: tweets ? 'ok' : 'no tweets found',
    });
  } catch {
    response.status(401).send({ data: null, message: 'jwt is not valid' });
  }
});

// ============ ADDING A BOOK ============:
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

export default tweetRouter;
