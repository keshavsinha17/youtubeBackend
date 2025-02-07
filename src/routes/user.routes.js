// import { Router } from "express";
// import {registerUser} from '../Controller/user.controller.js';
// import { upload } from "../Middleware/multer.middleware.js";
// const router=Router();
// router.route("/register").post(
//     upload.fields([
//         {
//             name: "avatar",
//             maxCount: 1
//         }, 
//         {
//             name: "coverImage",
//             maxCount: 1
//         }
//     ]),
//     registerUser)
// export default router

import { Router } from 'express';
import { 
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
} from '../Controller/user.controller.js';
import { verifyJWT } from '../Middleware/auth.middleware.js';
import { upload } from '../Middleware/multer.middleware.js';

const router = Router();

router.post(
    "/register",
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 }
    ]),
    registerUser
);

router.post("/login", loginUser);
// Secured routes
router.post("/logout", verifyJWT,logoutUser);
router.post("/refresh-token", refreshAccessToken);
router.post("/change-password", verifyJWT,changeCurrentPassword);
router.get("/me", verifyJWT,getCurrentUser);
router.patch("/update-account",verifyJWT,updateAccountDetails);
router.route("/avatar").patch(
    verifyJWT, upload.single("avatar"), updateAvatar)
router.patch("/cover-image", 
    verifyJWT, 
    upload.single("coverImage"),  // Make sure field name matches exactly
    updateCover
);
router.get("/channel/:username", verifyJWT, getUserChannelProfile);
router.get("/watch-history", verifyJWT, getWatchHistory);
export default router;