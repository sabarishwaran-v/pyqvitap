import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadPDFToCloudinary(folder: string, buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `papers/${folder}`,
        public_id: filename,
        resource_type: "raw",
        format: "pdf",
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error("Cloudinary upload failed"));
        }
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}

export async function uploadThumbnailToCloudinary(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}_thumb`;
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "papers/thumbnails",
        public_id: filename,
        resource_type: "image",
        format: "png",
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error("Cloudinary thumbnail upload failed"));
        }
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}
