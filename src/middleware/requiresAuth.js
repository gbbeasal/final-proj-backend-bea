// import jwt from 'jsonwebtoken';

// const requiresAuth = async (request, response, next) => {
//   const cookies = request.cookies;
//   const jwtSession = cookies.sessionId;

//   if (!jwtSession) {
//     response.status(401).send({ data: null, message: 'Invalid Request - Not Authorized' });
//     return;
//   }

//   try {
//     await jwt.verify(jwtSession, process.env.JWT_SECRET);
//     next(); // if authenticated, middleware lets you continue with the function logic
//   } catch {
//     response.status(401).send({ data: null, message: 'Invalid Request - Not Authorized' });
//   }
// };

// export default requiresAuth;
