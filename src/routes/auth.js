import express, { response } from 'express';
import pick from 'lodash/pick.js';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import omit from 'lodash/omit.js';
import jwt from 'jsonwebtoken';

const authRouter = express.Router();
const SALT_ROUNDS = 10;

// ============== GET MY PROFILE INFO VIA GET /myaccount ==============:
// Authenticated User = can see their own information
// Unauthenticated User = will be prompted to login

authRouter.get('/myaccount', async (request, response) => {
  const cookies = request.cookies;
  const jwtSession = cookies.sessionId;

  // Checks if you have a JWT Session and implements logic accordingly
  if (!jwtSession) {
    response
      .status(401)
      .send({ data: null, message: 'Not Authenticated - Please login' });
    return;
  }

  try {
    const jwtSessionObject = await jwt.verify(
      jwtSession,
      process.env.JWT_SECRET
    );
    const userId = jwtSessionObject.uid;
    const user = await request.app.locals.prisma.user.findUnique({
      where: { id: userId },
    });
    const filteredUser = omit(user, ['password', 'id']);
    response.send({
      user: filteredUser,
      message: filteredUser ? 'ok' : 'error',
    });
  } catch {
    response
      .status(401)
      .send({ data: null, message: 'Not Authenticated - Please login' });
  }
});

// ============== CREATE USER VIA POST /sign-up ==============:
// only users 18+ can sign up
authRouter.post(
  '/sign-up',
  [
    body('firstName').notEmpty().withMessage('First Name CANNOT be empty'),
    body('lastName').notEmpty().withMessage('Last Name CANNOT be empty'),
    body('userName').notEmpty().withMessage('Username CANNOT be empty'),
    body('birthday')
      .notEmpty()
      .withMessage('Date of Birth CANNOT be empty and must be mm-dd-yyyy'),
    body('email')
      .notEmpty()
      .isEmail()
      .withMessage('Email CANNOT be empty and must be a valid `email`'),
    body('password')
      .notEmpty()
      .isLength({ min: 8 })
      .withMessage(
        'Password CANNOT be empty and should be a minimum of 8 characters'
      ),
  ],
  async (request, response) => {
    const errors = validationResult(request);
    // if may laman si error, we send a reponse containing all the errors
    if (!errors.isEmpty()) {
      response.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const filteredBody = pick(request.body, [
        'firstName',
        'lastName',
        'userName',
        'email',
        'birthday',
        'password',
        'bio',
      ]);

      // to get age: calculate month difference from current date in time
      const dob = new Date(filteredBody.birthday);
      const month_diff = Date.now() - dob.getTime();
      //convert the calculated difference in date format
      const age_dt = new Date(month_diff);
      //extract year from date
      const year = age_dt.getUTCFullYear();
      //now calculate the age of the user
      const age = Math.abs(year - 1970);

      if (age < 18) {
        response
          .status(401)
          .send({ data: null, message: 'Only users 18+ can sign up' });
        return;
      }

      // encrypt the password and save it to the db
      const hashedPassword = await bcrypt.hash(
        filteredBody.password,
        SALT_ROUNDS
      );
      filteredBody.password = hashedPassword;

      // response.send({ data: filteredBody, message: "ok"})
      const user = await request.app.locals.prisma.user.create({
        data: filteredBody,
      });

      const filteredUser = omit(user, ['id', 'password']);

      // create jWT obj that contains info:
      const jwtSessionObject = {
        uid: user.id,
        email: user.email,
      };
      // create JWT Session:
      const maxAge = 1 * 24 * 60 * 60; // time in milliseconds
      const jwtSession = await jwt.sign(
        jwtSessionObject,
        process.env.JWT_SECRET,
        {
          expiresIn: maxAge, // this jwt will expire in 24 hours
        }
      );

      // attach jwt to cookie:
      response.cookie('sessionId', jwtSession, {
        httpOnly: true, // only server can read cookie, not browser
        maxAge: maxAge * 1000, // time in seconds
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production' ? true : false,
      });

      response.send({
        data: filteredUser,
        message: user
          ? 'New user added successfully'
          : 'Error, user creation unsuccessful',
      });
    } catch {
      response.send({
        data: null,
        message: 'Invalid Request - Please try again',
      });
    }
  }
);

// ============== EMAIL SIGN IN VIA POST /sign-in/email ==============:
// to sign in via email

authRouter.post(
  '/sign-in/email',
  [
    body('email')
      .notEmpty()
      .isEmail()
      .withMessage('Email CANNOT be empty and must be a valid `email`'),
    body('password')
      .notEmpty()
      .isLength({ min: 8 })
      .withMessage('Password CANNOT be empty'),
  ],
  async (request, response) => {
    const errors = validationResult(request);
    // if may laman si error, we send a reponse containing all the errors
    if (!errors.isEmpty()) {
      response.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const filteredBody = pick(request.body, ['email', 'password']);

      // finds the user's email in the database
      const user = await request.app.locals.prisma.user.findUnique({
        where: { email: filteredBody.email },
      });

      if (!user) {
        response.status(404).json({ message: 'Invalid Email or Password' });
        return;
      }

      // comparison of saved password and entered password:
      const hashedPassword = user.password;
      const isSamePassword = await bcrypt.compare(
        filteredBody.password,
        hashedPassword
      );

      // if password doesn't match:
      if (!isSamePassword) {
        // response.send({ message: 'mali ka boi' });
        response.status(404).json({ message: 'Invalid Email or Password' });
      }

      // selecting things to omit from the response:
      const filteredUser = omit(user, ['id', 'password']);

      // create jWT obj that contains info:
      const jwtSessionObject = {
        uid: user.id,
        email: user.email,
      };
      // create JWT Session:
      const maxAge = 1 * 24 * 60 * 60; // time in milliseconds
      const jwtSession = await jwt.sign(
        jwtSessionObject,
        process.env.JWT_SECRET,
        {
          expiresIn: maxAge, // this jwt will expire in 24 hours
        }
      );

      // console.log("jwtSession: ", jwtSession);

      // attach jwt to cookie:
      response.cookie('sessionId', jwtSession, {
        httpOnly: true, // only server can read cookie, not browser
        maxAge: maxAge * 1000, // time in seconds
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production' ? true : false,
        // ^^^ enable secure https if nasa prod environment na
      });

      response.send({
        data: filteredUser,
        message: user ? 'Welcome' : 'Error, user login unsuccessful',
      });
    } catch {
      response.send({
        data: null,
        message: 'Invalid Request - Please try again',
      });
    }
  }
);

// ============== USERNAME LOGIN VIA POST /sign-in/username ==============:
// to sign in via username

authRouter.post(
  '/sign-in/username',
  [
    body('userName').notEmpty().withMessage('Username CANNOT be empty'),
    body('password')
      .notEmpty()
      .isLength({ min: 8 })
      .withMessage('Password CANNOT be empty'),
  ],
  async (request, response) => {
    const errors = validationResult(request);
    // if may laman si error, we send a reponse containing all the errors
    if (!errors.isEmpty()) {
      response.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const filteredBody = pick(request.body, ['userName', 'password']);

      // finds the user's email in the database
      const user = await request.app.locals.prisma.user.findUnique({
        where: { userName: filteredBody.userName },
      });

      if (!user) {
        response
          .status(404)
          .json({ message: 'Invalid Request - User not found' });
        return;
      }

      // comparison of saved password and entered password:
      const hashedPassword = user.password;
      const isSamePassword = await bcrypt.compare(
        filteredBody.password,
        hashedPassword
      );

      // if password doesn't match:
      if (!isSamePassword) {
        // response.send({ message: 'mali ka boi' });
        response.status(404).json({ message: 'Invalid Username or Password' });
      }

      // selecting things to omit from the response:
      const filteredUser = omit(user, ['id', 'password']);

      // create jWT obj that contains info:
      const jwtSessionObject = {
        uid: user.id,
        userName: user.userName,
      };
      // create JWT Session:
      const maxAge = 1 * 24 * 60 * 60; // time in milliseconds
      const jwtSession = await jwt.sign(
        jwtSessionObject,
        process.env.JWT_SECRET,
        {
          expiresIn: maxAge, // this jwt will expire in 24 hours
        }
      );

      // console.log("jwtSession: ", jwtSession);

      // attach jwt to cookie:
      response.cookie('sessionId', jwtSession, {
        httpOnly: true, // only server can read cookie, not browser
        maxAge: maxAge * 1000, // time in seconds
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production' ? true : false,
        // ^^^ enable secure https if nasa prod environment na
      });

      response.send({
        data: filteredUser,
        message: user ? 'Welcome' : 'Error, user login unsuccessful',
      });
    } catch {
      response.send({
        data: null,
        message: 'Invalid Request - Please try again',
      });
    }
  }
);

// ============== EDIT PROFILE FIELDS VIA PUT /edit-profile ==============:
// to edit fields: password, username, bio

authRouter.put('/edit-profile', async (request, response) => {
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

    const filteredBody = pick(request.body, ['password', 'userName', 'bio']);

    // encrypt the password and save it to the db
    const hashedPassword = await bcrypt.hash(
      filteredBody.password,
      SALT_ROUNDS
    );
    filteredBody.password = hashedPassword;

    const user = await request.app.locals.prisma.user.update({
      where: { id: userId },
      data: filteredBody,
    });

    const filteredUser = omit(user, ['password', 'id']);
    response.send({
      user: filteredUser,
      message: filteredUser ? 'ok' : 'error',
    });
  } catch {
    response.status(401).send({
      data: null,
      message: 'Update Unsuccessful - field MUST be valid',
    });
  }
});

// ============== POST /sign-out ==============:
// expire the cookie by making the maxAge = 1

authRouter.post('/sign-out', async (request, response) => {
  const cookies = request.cookies;
  const jwtSession = cookies.sessionId;
  //expires the cookie by making the max age = 1 ms
  response.cookie('sessionId', jwtSession, { maxAge: 1 });
  response.send({ data: null, message: 'Successfully Signed Out' });
});

export default authRouter;
