import express, { request } from 'express';
import jwt from 'jsonwebtoken';
import omit from 'lodash/omit.js';
import pick from 'lodash/pick.js';

const followRouter = express.Router();

// ============ GETTING ALL USERS I FOLLOW via /usersifollow ============:
// Authenticated User = can see the users they've followed
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

// ============ GETTING ALL USERS THAT FOLLOW ME VIA /usersthatfollowme ============:
// Authenticated User = can see the users that follow them
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

// ============ GETTING ALL USERS MY SPECIFIED USER IS FOLLOWING VIA /following/:userName ============:
// Authenticated User = can see the users that a user is following
// Unauthenticated/Invalid JWT Session User = can only see up to 15 followed users

followRouter.get('/following/:userName', async (request, response) => {
  const cookies = request.cookies;
  const jwtSession = cookies.sessionId;
  const userName = request.params.userName;

  // specified user = follower kase sya yung nag fofollow tas pinapakita natin yung mga "following" nya
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

// ============ GETTING ALL FOLLOWERS OF MY SPECIFIED USER VIA /followers/:userName ============:
// Authenticated User = can see the followers of the specified user
// Unauthenticated/Invalid JWT Session User = can see up to 15 followers of the specified user only

followRouter.get('/followers/:userName', async (request, response) => {
  const cookies = request.cookies;
  const jwtSession = cookies.sessionId;
  const userName = request.params.userName;

  // specifed user = being followed so
  const beingFollowed = await request.app.locals.prisma.user.findUnique({
    where: { userName: userName },
  });

  // if specified user doesnt exist
  if (!beingFollowed) {
    response
      .status(401)
      .send({ data: null, message: 'Invalid Request - User does not exist' });
    return;
  }

  // unauth =  you can only view max 15 followers from a user
  if (!jwtSession) {
    const followers = await request.app.locals.prisma.follow.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      where: { followingId: beingFollowed.id },
      take: 15,
    });

    response.send({
      Followers: followers,
      message: followers ? 'ok' : 'error',
    });
    return;
  }

  try {
    const jwtSessionObject = await jwt.verify(
      jwtSession,
      process.env.JWT_SECRET
    );

    const followers = await request.app.locals.prisma.follow.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      where: { followingId: beingFollowed.id },
    });

    response.send({
      Followers: followers,
      message: followers ? 'ok' : 'You are not being followed by anyone',
    });
  } catch {
    response
      .status(401)
      .send({ data: null, message: 'Invalid Request - Please try again' });
  }
});

// ============ FOLLOW AND UNFOLLOW VIA PUT /:userName/follow ============:
// Authenticated User = can follow/follow
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
