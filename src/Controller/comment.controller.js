import { asyncHandler } from "../utilities/AsyncHandler.js"
import { ApiError } from "../utilities/ApiError.js"
import { ApiResponse } from "../utilities/ApiResponse.js"
import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../model/comment.model.js"
import  { Video } from "../model/video.model.js"
const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Video Id does not exist");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const comments = await Comment.find({
        video: videoId,
    })
        .populate("owner", "username")
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments retrieved successfully"));

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params;
    const { content } = req.body;

    if (!videoId || !content?.trim()) {
        throw new ApiError(400, "All fields are required")
    }

    if (content.length > 500) {
        throw new ApiError(400, "Comment is too long. Maximum 500 characters allowed")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const comment = await Comment.create({
        content: content.trim(),
        video: videoId,
        owner: req.user._id
    })

    return res.status(201).json(
        new ApiResponse(201, comment, "Comment created successfully")
    )
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params;
    const { content } = req.body;
    // Validation for commentId and content
    if (!commentId || !content?.trim()) {
        throw new ApiError(400, "All fields are required")
    }
    // Find the comment
    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }
    // check if the user is the owner of the comment
    if (!comment.owner.equals(req.user._id)) {
        throw new ApiError(403, "You are not authorized to update this comment")
    }
    // update the comment
    comment.content = content.trim()
    await comment.save()
    return res.status(200).json(
        new ApiResponse(200, comment, "Comment updated successfully")
    )

})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params
    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }
    if (!comment.owner.equals(req.user._id)) {
        throw new ApiError(403, "You are not authorized to delete this comment")
    }
    await findAndDelete(commentId)
    return res.status(200).json(
        new ApiResponse(200, {}, "Comment deleted successfully")
    )

})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}
