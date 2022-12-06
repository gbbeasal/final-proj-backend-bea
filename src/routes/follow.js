import express, { request } from 'express';
import jwt from 'jsonwebtoken';
import omit from 'lodash/omit.js';

const followRouter = express.Router();

// ============ GETTING ALL FAVORITES ============:
// Authenticated User = can see their tweets
// Unauthenticated/Invalid JWT Session User = will be prompted to login

// followRouter.get('/myfavorites', async (request, response) => {
//   const cookies = request.cookies;
//   const jwtSession = cookies.sessionId;

//   if (!jwtSession) {
//     response
//       .status(401)
//       .send({ data: null, message: 'Invalid Request - Please login' });
//     return;
//   }

//   try {
//     const jwtSessionObject = await jwt.verify(
//       jwtSession,
//       process.env.JWT_SECRET
//     );
//     const userId = jwtSessionObject.uid;

//     const favorites = await request.app.locals.prisma.favorite.findMany({
//       orderBy: {
//         createdAt: 'desc',
//       },
//       where: { userId: userId },
//       include: {
//         tweet: true,
//       },
//     });

//     response.send({
//       favorites: favorites,
//       message: favorites ? 'ok' : 'no replies found',
//     });
//   } catch {
//     response
//       .status(401)
//       .send({ data: null, message: 'Invalid Request - Please try again' });
//   }
// });

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
      response
        .status(401)
        .send({ data: null, message: 'Invalid Request - You cannot follow yourself' });
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
