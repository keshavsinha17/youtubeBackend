import { asyncHandler } from "../utilities/AsyncHandler.js";
import { ApiError } from "../utilities/ApiError.js";
import { ApiResponse } from "../utilities/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../model/tweet.model.js";
import { User } from "../model/user.model.js";

const createTweet = asyncHandler(async (req, res) => {
    // Add detailed request logging
    console.log("Full request body:", req.body);
    // console.log("Content-Type:", req.headers['content-type']);
    
    const { content } = req.body
    // console.log("Tweet content:", content);

    if (!content?.trim()) {
        throw new ApiError(400, "Tweet content is required")
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user._id
    })

    if (!tweet) {
        throw new ApiError(500, "Failed to create tweet")
    }

    return res.status(201).json(
        new ApiResponse(200, tweet, "Tweet created successfully")
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const{userId} = req.params;
    if(!isValidObjectId(userId)) {    
        throw new ApiError(400, "User Id does not exist")
    }
    const user = await User.findById(userId);
    if(!user) {
        throw new ApiError(404, "User not found")
    }

    const tweets = await Tweet.find({
        owner: userId
    }).populate("owner", "username")

    return res.status(200).json(
        new ApiResponse(200, tweets, "Tweets fetched successfully")
    )
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params;
    if(!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Tweet Id does not exist")
    }
    const tweet = await Tweet.findById(tweetId);
    if(!tweet) {
        throw new ApiError(404, "Tweet not found")
    }
    await tweet.deleteOne();
    return res.status(200).json(    
        new ApiResponse(200, {}, "Tweet deleted successfully")    
    )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
