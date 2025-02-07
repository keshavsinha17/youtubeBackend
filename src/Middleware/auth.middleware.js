import { asyncHandler } from "../utilities/AsyncHandler.js"
import {ApiError} from "../utilities/ApiError.js";
import {User} from "../model/user.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
// export const verifyJWT = asyncHandler(async (req, _ , next) => {}//response can be empty hence a underscore

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        // console.log(req.cookies);

        
        const token =  req.cookies?.accesssToken || req.header("Authorization")?.replace("Bearer ", "");

        // console.log(token);
        
        if(!token){
            throw new ApiError(401, "Unauthorized request - No token provided")
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        if(!decodedToken){
            throw new ApiError(401, "Invalid access token")
        }
    
        const user = await User.findById(decodedToken._id).select("-password -refreshToken");
        if(!user){
            throw new ApiError(401, "Invalid access token - User not found")
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
})