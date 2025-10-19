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
export const isCloudUrl = (u?: string): boolean =>
  !!u && (u.startsWith("https://firebasestorage.googleapis.com/") || u.startsWith("https://"));
