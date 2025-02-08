import { asyncHandler } from "../utilities/AsyncHandler.js";
import { ApiError } from "../utilities/ApiError.js";
import { ApiResponse } from "../utilities/ApiResponse.js";
const healthcheck = asyncHandler(async (req, res) => {
    //TODO: build a healthcheck response that simply returns the OK status as json with a message
    try {
        return res
        .status(200).json(
            new ApiResponse(200, {}, "OK")
        )
    } catch (error) {
        throw new ApiError(500, "Something went wrong");
    }
})


export {
    healthcheck
    }