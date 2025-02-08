import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

// routes import
import userRouter from "./src/routes/user.routes.js";
import tweetRouter from "./src/routes/tweet.routes.js";
import healthcheckRouter from "./src/routes/healthcheck.routes.js";





// routes
app.use("/api/v1/healthcheck", healthcheckRouter)
app.use("/api/v1/users",userRouter);
app.use("/api/v1/tweets", tweetRouter)
// http://localhost:8000/api/v1/users/register
export default app;