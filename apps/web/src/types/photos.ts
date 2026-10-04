export type UploadStatus = "idle" | "uploading" | "uploaded" | "error";

export interface PhotoItem {
  id: string;              // uuid for UI list
  file?: File;             // browser File (optional after upload)
  preview: string;         // data URL for local preview
  url?: string;            // HTTPS download URL after upload
  storagePath?: string;    // returned from Firebase
  status: UploadStatus;
  error?: string;
}

// Helper function to validate cloud URLs
// Storage emulator (local sandbox) serves plain http on port 9199
const EMULATOR_STORAGE = /^http:\/\/(localhost|127\.0\.0\.1):9199\//;

export const isCloudUrl = (u?: string): boolean =>
  !!u && (u.startsWith("https://") ||
    (process.env.NEXT_PUBLIC_USE_EMULATOR === "true" && EMULATOR_STORAGE.test(u)));
