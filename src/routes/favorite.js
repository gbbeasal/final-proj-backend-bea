import express, { request } from 'express';
import jwt from 'jsonwebtoken';
import omit from 'lodash/omit.js';

const favoriteRouter = express.Router();

// ============ GETTING ALL FAVORITES ============:
// Authenticated User = can see their tweets
// Unauthenticated/Invalid JWT Session User = will be prompted to login

favoriteRouter.get('/myfavorites', async (request, response) => {
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

    const favorites = await request.app.locals.prisma.favorite.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      where: { userId: userId },
      include: {
        tweet: true,
      },
    });

    response.send({
      favorites: favorites,
      message: favorites ? 'ok' : 'no replies found',
    });
  } catch {
    response
      .status(401)
      .send({ data: null, message: 'Invalid Request - Please try again' });
  }
});

// ============ ADDING A FAVORITE ============:
// Authenticated User = can create their own tweet
// Unauthenticated/Invalid JWT Session User = will be prompted to login
favoriteRouter.put('/tweets/:tweetId/favorite', async (request, response) => {
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

    // if fave exists, delete it. Else continue with creation

    const favorites = await request.app.locals.prisma.favorite.findUnique({
      where: {
        userId_tweetId: {
          userId: userId,
          tweetId: tweetId,
        },
      },
    });

    if (!favorites) {
      const favorites = await request.app.locals.prisma.favorite.create({
        data: {
          tweetId: tweetId,
          userId: userId,
        },
      });

      const filteredFavorites = omit(favorites, ['userId']);
      response.send({
        favorites: filteredFavorites,
        message: filteredFavorites
          ? 'Tweet successfully added to favorites'
          : 'Favorite Unsuccessful',
      });
    }

    const unfavorite = await request.app.locals.prisma.favorite.delete({
      where: {
        userId_tweetId: {
          userId: userId,
          tweetId: tweetId,
        },
      },
    });

    response.send({
      favorites: unfavorite,
      message: unfavorite
        ? 'Tweet successfully removed from favorites'
        : 'Unfavorite Unsuccessful',
    });
  } catch {
    response
      .status(401)
      .send({ data: null, message: 'Invalid Request - Please try again' });
  }
});

export default favoriteRouter;
