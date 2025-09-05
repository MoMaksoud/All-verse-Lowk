import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { success } from "@/lib/response";
import { makeError } from "@marketplace/types";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withApi(async (req: NextRequest) => {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    
    if (!files || files.length === 0) {
      throw makeError("BAD_REQUEST", "No files provided");
    }

    if (files.length > 5) {
      throw makeError("BAD_REQUEST", "Maximum 5 files allowed");
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads");
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    const uploadedUrls: string[] = [];

    // Process files in order
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        throw makeError("BAD_REQUEST", "Only image files are allowed");
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw makeError("TOO_LARGE", "File size must be less than 10MB");
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Generate unique filename
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const filename = `${randomUUID()}.${fileExtension}`;
      const filepath = join(uploadsDir, filename);
      
      await writeFile(filepath, buffer);
      
      // Return URL path
      uploadedUrls.push(`/uploads/${filename}`);
    }

    return success({ urls: uploadedUrls });
  } catch (error: any) {
    if (error.error) {
      throw error;
    }
    throw makeError("INTERNAL", "Failed to upload files");
  }
});
