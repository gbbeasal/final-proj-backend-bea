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

// ============ ADDING A FAVORITE ============:
// Authenticated User = can create their own tweet
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

    // if intended user to follow does not exist, end the program
    if (!userToFollow) {
      response
        .status(401)
        .send({ data: null, message: 'Invalid Request - User does not exist' });
      return;
    }

    // if already followed, unfollow:
    // const isFollowed = await request.app.locals.prisma.follow.findUnique({
    //   where: {
    //     followerId_followingId: {
    //       followerId: follwerId,
    //       followingId: followingId,
    //     },
    //   },
    // });


    
    // create following link:
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



    // const unfavorite = await request.app.locals.prisma.favorite.delete({
    //   where: {
    //     userId_tweetId: {
    //       userId: userId,
    //       tweetId: tweetId,
    //     },
    //   },
    // });

    // response.send({
    //   favorites: unfavorite,
    //   message: unfavorite
    //     ? 'Tweet successfully removed from favorites'
    //     : 'Unfavorite Unsuccessful',
    // });
  } catch {
    response
      .status(401)
      .send({ data: null, message: 'Invalid Request - Please try again' });
  }
});

export default followRouter;
