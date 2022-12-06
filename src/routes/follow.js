import express, { request } from 'express';
import jwt from 'jsonwebtoken';
import omit from 'lodash/omit.js';
import pick from 'lodash/pick.js';

const followRouter = express.Router();

// ============ GETTING ALL USERS I FOLLOW ============:
// Authenticated User = can see their tweets
// Unauthenticated/Invalid JWT Session User = will be prompted to login

followRouter.get('/usersifollow', async (request, response) => {
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

    const following = await request.app.locals.prisma.follow.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      where: { followerId: userId },
    });

    response.send({
      usersIFollow: following,
      message: following ? 'ok' : 'You are not following anyone',
    });
  } catch {
    response
      .status(401)
      .send({ data: null, message: 'Invalid Request - Please try again' });
  }
});

// ============ GETTING ALL USERS THAT FOLLOW ME ============:
// Authenticated User = can see their tweets
// Unauthenticated/Invalid JWT Session User = will be prompted to login

followRouter.get('/usersthatfollowme', async (request, response) => {
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

    const followers = await request.app.locals.prisma.follow.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      where: { followingId: userId },
    });

    response.send({
      Followers: followers,
      message: followers ? 'ok' : 'You are not following anyone',
    });
  } catch {
    response
      .status(401)
      .send({ data: null, message: 'Invalid Request - Please try again' });
  }
});

// ============ GETTING ALL USERS MY SPECIFIED USER IS FOLLOWING ============:
// Authenticated User = can see their tweets
// Unauthenticated/Invalid JWT Session User = will be prompted to login

followRouter.get('/following/:userName', async (request, response) => {
  const cookies = request.cookies;
  const jwtSession = cookies.sessionId;
  const userName = request.params.userName;

  const follower = await request.app.locals.prisma.user.findUnique({
    where: { userName: userName },
  });

  // if specified user doesnt exist
  if (!follower) {
    response
      .status(401)
      .send({ data: null, message: 'Invalid Request - User does not exist' });
    return;
  }

  // unauth =  you can only view max 15 followers from a user
  if (!jwtSession) {
    const following = await request.app.locals.prisma.follow.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      where: { followerId: follower.id },
      take: 15,
    });

    response.send({
      Following: following,
      message: following ? 'ok' : 'error',
    });
    return;
  }

  try {
    const jwtSessionObject = await jwt.verify(
      jwtSession,
      process.env.JWT_SECRET
    );
    // const userId = jwtSessionObject.uid;

    const follower = await request.app.locals.prisma.user.findUnique({
      where: { userName: userName },
    });

    const following = await request.app.locals.prisma.follow.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      where: { followerId: follower.id },
    });

    response.send({
      Following: following,
      message: following ? 'ok' : 'You are not following anyone',
    });
  } catch {
    response
      .status(401)
      .send({ data: null, message: 'Invalid Request - Please try again' });
  }
});

// ============ FOLLOW AND UNFOLLOW ============:
// Authenticated User = can follow
// Unauthenticated/Invalid JWT Session User = will be prompted to login

followRouter.put('/:userName/follow', async (request, response) => {
  const cookies = request.cookies;
  const jwtSession = cookies.sessionId;
  const userName = request.params.userName;

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

    const userToFollow = await request.app.locals.prisma.user.findUnique({
      where: { userName: userName },
    });

    // cannot follow self:

    if (userId == userToFollow.id) {
      response.status(401).send({
        data: null,
        message: 'Invalid Request - You cannot follow yourself',
      });
      return;
    }

    // if intended user to follow does not exist, end the program
    if (!userToFollow) {
      response
        .status(401)
        .send({ data: null, message: 'Invalid Request - User does not exist' });
      return;
    }

    // check following status
    const isFollowed = await request.app.locals.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: userToFollow.id,
        },
      },
    });

    if (!isFollowed) {
      // if not followed, create following link:
      const follows = await request.app.locals.prisma.follow.create({
        data: {
          followerId: userId,
          followingId: userToFollow.id,
        },
      });

      response.send({
        favorites: follows,
        message: follows ? 'Successfully followed user' : 'Follow Unsuccessful',
      });
      return;
    }

    // if already followed, unfollow:

    const unfollow = await request.app.locals.prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: userToFollow.id,
        },
      },
    });

    response.send({
      favorites: unfollow,
      message: unfollow
        ? 'User successfully unfollowed'
        : 'Unfollow Unsuccessful',
    });
  } catch {
    response
      .status(401)
      .send({ data: null, message: 'Invalid Request - Please try again' });
  }
});

export default followRouter;
