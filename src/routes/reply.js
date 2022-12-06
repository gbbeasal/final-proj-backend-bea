import express, { request } from 'express';
import pick from 'lodash/pick.js';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';

const replyRouter = express.Router();

// ============ GETTING ALL MY REPLIES VIA GET /myreplies ============:
// Authenticated User = can see their tweets
// Unauthenticated/Invalid JWT Session User = will be prompted to login

replyRouter.get('/myreplies', async (request, response) => {
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
    const replies = await request.app.locals.prisma.reply.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      where: { userId: userId },
    });
    response.send({
      replies: replies,
      message: replies ? 'ok' : 'no replies found',
    });
  } catch {
    response
      .status(401)
      .send({ data: null, message: 'Invalid Request - Please try again' });
  }
});

// ============ GETTING ALL OF MY TWEETS AND REPLIES VIA GET /tweetsandreplies ============:
// Authenticated User = can see their tweets
// Unauthenticated/Invalid JWT Session User = will be prompted to login

replyRouter.get('/tweetsandreplies', async (request, response) => {
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
        createdAt: 'desc',
      },
      where: { userId: userId },
      include: {
        reply: true,
      },
    });
    response.send({
      tweetsAndReplies: tweets,
      message: tweets ? 'ok' : 'no tweets found',
    });
  } catch {
    response
      .status(401)
      .send({ data: null, message: 'Invalid Request - Please try again' });
  }
});

// ============== GETTING ALL TWEETS AND REPLIES BY USERNAME VIA GET /tweetsandreplies/:userName  ==============:
// Authenticated User = can see the tweets and replies of a specified user
// Unauthenticated/Invalid JWT Session User = can only see email and bio of the user they're looking at
// if user they are looking for doesn't exist, it returns a prompt saying so

replyRouter.get('/tweetsandreplies/:userName', async (request, response) => {
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
      include: {
        reply: true,
      },
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

// ============ ADDING A REPLY VIA POST /tweets/:tweetId/reply  ============:
// Authenticated User = can create their own tweet
// Unauthenticated/Invalid JWT Session User = will be prompted to login
replyRouter.post(
  '/tweets/:tweetId/reply',
  [
    body('content')
      .notEmpty()
      .isLength({ max: 280 })
      .withMessage('Tweets must have 1-280 characters'),
  ],
  async (request, response) => {
    const cookies = request.cookies;
    const jwtSession = cookies.sessionId;
    const tweetId = parseInt(request.params.tweetId);

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

      const replies = await request.app.locals.prisma.reply.create({
        data: {
          content: request.body.content,
          tweetId: tweetId,
          userId: userId,
        },
      });

      response.send({
        reply: replies,
        message: replies
          ? 'Tweet successfully replied to'
          : 'Reply Unsuccessful',
      });
    } catch {
      response
        .status(401)
        .send({ data: null, message: 'Invalid Request - Please try again' });
    }
  }
);

export default replyRouter;
