import express, { response } from "express";
import { PrismaClient } from "@prisma/client";
import authRouter from "./routes/auth.js";
import tweetRouter from "./routes/tweet.js";
import replyRouter from "./routes/reply.js";
import cookieParser from 'cookie-parser';

const app = express();
app.use(express.json()); // need to be able to do POST requests
app.use(cookieParser()); // allows express to read/create cookies
const prisma = new PrismaClient(); // used for us to get data from the db + L2
const PORT = 4000;

app.use(authRouter);
app.use(tweetRouter);
app.use(replyRouter);

// express allows us to define global variables using app.locals
// yung prisma sa L6 nagrerefer sa L12; now we can reuse
app.locals.prisma = prisma;

app.get("/", (request, response) => {
//   console.log("testing");
  response.send({ message: "hi" })
});

app.listen(PORT, () => console.log(`Listening on Port ${PORT}`));