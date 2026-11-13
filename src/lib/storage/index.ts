import type { StorageService } from "./types";
import { CloudinaryStorage } from "./cloudinary";
import { R2Storage } from "./r2";

export * from "./types";
export { CloudinaryStorage } from "./cloudinary";
export { R2Storage } from "./r2";

let defaultStorage: StorageService | null = null;

export function getStorageService(): StorageService {
  if (!defaultStorage) {
    if (process.env.STORAGE_PROVIDER === "cloudinary") {
      defaultStorage = new CloudinaryStorage();
    } else {
      defaultStorage = new R2Storage();
    }
  }
  return defaultStorage;
}
