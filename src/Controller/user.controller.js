import mongoose from "mongoose";
import { asyncHandler } from '../utilities/AsyncHandler.js'
import { ApiError } from '../utilities/ApiError.js'
import { User } from '../model/user.model.js'

import { uploadFileOnCloudinary } from '../utilities/cloudinary.upload.js'
import { ApiResponse } from '../utilities/ApiResponse.js'
import jwt from 'jsonwebtoken'

// Helper Function to generate access token and refresh token

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (err) {
        console.error("Token generation error:", err);
        throw new ApiError(500, "Something went wrong while generating tokens");
    }
}


const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    // Add detailed logging
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);

    const { fullname, email, username, password } = req.body
    console.log("email: ", email);

    if (
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // Check if files exist in request
    if (!req.files || !req.files.avatar) {
        throw new ApiError(400, "Avatar file is missing in the request")
    }

    // Log the file paths
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    let coverImageLocalPaths;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPaths = req.files?.coverImage[0].path;

    }

    console.log("Avatar path:", avatarLocalPath);
    console.log("Cover image path:", coverImageLocalPath);

    let avatar;
    try {
        avatar = await uploadFileOnCloudinary(avatarLocalPath);
        console.log("Cloudinary avatar response:", avatar);
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        throw new ApiError(400, "Error uploading avatar to cloudinary");
    }

    let coverImage;
    if (coverImageLocalPath) {
        try {
            coverImage = await uploadFileOnCloudinary(coverImageLocalPath);
        } catch (error) {
            console.error("Cloudinary cover image upload error:", error);
            // Don't throw error for cover image as it's optional
        }
    }

    if (!avatar) {
        throw new ApiError(400, "Error while uploading avatar")
    }

    const user = await User.create({
        fullname: fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

})


const loginUser = asyncHandler(async (req, res) => {
    // check and validate frontend req
    // check if user exists
    // check if password is correct
    // create access token and refresh token
    // return res
    const { email, password, username } = req.body
    console.log("email: ", email, "password: ", password, "username: ", username);

    if (!username && !email) {
        throw new ApiError(400, "Enter username or email")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // check in currently created user not in mongoose User model
    const isPasswordCorrect = await user.isPasswordCorrect(password);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Authorization error , Incorrect password");
    }

    // Create access token and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    // getting logged in user instance * can also be done by updating user fetched 
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!loggedInUser) {
        throw new ApiError(500, "Something went wrong while logging in the user")
    }

    const options = {
        httpOnly: true,
        secure: true,
    }
    return res
        .status(200)
        .cookie("accesssToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged in Successfully"
            )
        )
})


const logoutUser = asyncHandler(async (req, res) => {
    try {
        // Check if user exists in request
        if (!req.user?._id) {
            throw new ApiError(401, "Unauthorized request");
        }

        // Update user document
        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: {
                    refreshToken: ""
                }
            },
            { new: true }
        );

        // Check if update was successful
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        // Clear cookies and send response
        return res
            .status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json(new ApiResponse(200, {}, "User logged out successfully"));
    } catch (error) {
        console.error("Logout error:", error);
        throw new ApiError(500, "Error during logout");
    }
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;

        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized request - No refresh token provided")
        }

        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(401, "Invalid refresh token - User not found")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }

        const options = {
            httpOnly: true,
            secure: false // Set to true in production
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})


const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Enter old password and new password")
    }

    const user = await User.findById(req.user?._id);

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Incorrect old password");
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
})


const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200).
        json(
            new ApiResponse(200,
                req.user,
                "current user fetched successfully"
            ));
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body;
    if (!fullname || !email) {
        throw new ApiError(400, "Enter name and email")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname: fullname,
                email: email
            }
        },
        { new: true }

    ).select("-password");
    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Account details updated successfully"));
})

const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar not uploaded");
    }

    const avatar = await uploadFileOnCloudinary(avatarLocalPath);
    if(!avatar.url){
        throw new ApiError(400, "Error while uploading on Cloudinary");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password").lean();

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200, 
                {
                    avatar: user.avatar
                }, 
                "Avatar updated successfully"
            )
        );
})

const updateCover = asyncHandler(async (req, res) => {
    // console.log("Request body:", req.body);  // Debug request body
    // console.log("Request file:", req.file);  // Debug file object
    // console.log("Request files:", req.files); // Debug files object
    
    const coverLocalPath = req.file?.path;
    // console.log("Cover path:", coverLocalPath);
    
    if(!coverLocalPath){
        throw new ApiError(400, "Cover image not uploaded");
    }

    const coverImage = await uploadFileOnCloudinary(coverLocalPath);
    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading on Cloudinary");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password").lean();

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Cover image updated successfully"));
})


const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})

// Aggregation pipeline for subscriber count of a channel
const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {username} = req.params;
    console.log("Username from params:", username); // Debug
    
    if(!username){
        throw new ApiError(400, "Username parameter is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ]); 

    if(!channel?.length){
        throw new ApiError(404, "Channel not found")
    }   

    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "User channel fetched successfully"));
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCover,
    getUserChannelProfile,
    getWatchHistory
}