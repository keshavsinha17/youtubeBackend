import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
cloudinary.config({
    // cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    cloud_name:process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Add this console log to verify configuration
// console.log("Cloudinary Configuration:", {
//     cloud_name: process.env.CLOUDINARY_NAME ,
//     api_key: process.env.CLOUDINARY_API_KEY ? "API Key exists" : "API Key missing",
//     api_secret: process.env.CLOUDINARY_API_SECRET ? "API Secret exists" : "API Secret missing"
// });

export const uploadFileOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        
        // Check if file exists
        if (!fs.existsSync(localFilePath)) {
            console.error("File not found:", localFilePath);
            return null;
        }

        // Upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });
        
        // File has been uploaded successfully
        console.log("File uploaded successfully", response.url);
        
        // Remove file from local storage
        fs.unlinkSync(localFilePath);
        
        return response;

    } catch (error) {
        console.error("Cloudinary upload error:", error);
        // Remove the locally saved temporary file as the upload operation failed
        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return null;
    }
}