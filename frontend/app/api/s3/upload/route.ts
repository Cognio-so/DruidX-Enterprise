import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import r2 from "@/lib/S3Client";
import { requireUser } from "@/data/requireUser";

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export async function POST(req: NextRequest) {
  const { user } = await requireUser();

  try {
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileName, fileType } = await req.json();

    if (!fileName) {
      return NextResponse.json(
        { error: "fileName is required" },
        { status: 400 }
      );
    }

    // Check MIME type if provided
    const hasValidMimeType = fileType && (
      fileType.startsWith("image/") || 
      fileType.startsWith("application/pdf") || 
      fileType.startsWith("application/msword") || 
      fileType.startsWith("application/vnd.openxmlformats-officedocument.wordprocessingml.document") || 
      fileType.startsWith("text/markdown") || 
      fileType.startsWith("application/json")
    );

    // Check file extension as fallback (for files with empty or unrecognized MIME types)
    const fileNameLower = fileName.toLowerCase();
    const hasValidExtension = fileNameLower.endsWith(".md") ||
      fileNameLower.endsWith(".markdown") ||
      fileNameLower.endsWith(".pdf") ||
      fileNameLower.endsWith(".doc") ||
      fileNameLower.endsWith(".docx") ||
      fileNameLower.endsWith(".json") ||
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);

    if (!hasValidMimeType && !hasValidExtension) {
      return NextResponse.json(
        { error: "Only images, PDFs, Word docs, Markdown, and JSON files allowed" },
        { status: 400 }
      );
    }

    // Use provided fileType or infer from extension
    let contentType = fileType || "application/octet-stream";
    if (!fileType || fileType === "" || fileType === "application/octet-stream") {
      if (fileNameLower.endsWith(".md") || fileNameLower.endsWith(".markdown")) {
        contentType = "text/markdown";
      } else if (fileNameLower.endsWith(".pdf")) {
        contentType = "application/pdf";
      } else if (fileNameLower.endsWith(".doc")) {
        contentType = "application/msword";
      } else if (fileNameLower.endsWith(".docx")) {
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      } else if (fileNameLower.endsWith(".json")) {
        contentType = "application/json";
      } else if (/\.(jpg|jpeg)$/i.test(fileName)) {
        contentType = "image/jpeg";
      } else if (fileNameLower.endsWith(".png")) {
        contentType = "image/png";
      } else if (fileNameLower.endsWith(".gif")) {
        contentType = "image/gif";
      } else if (fileNameLower.endsWith(".webp")) {
        contentType = "image/webp";
      } else if (fileNameLower.endsWith(".svg")) {
        contentType = "image/svg+xml";
      }
    }

    const key = `${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(r2, command, { expiresIn: 60 });

    return NextResponse.json({
      uploadUrl: signedUrl,
      fileUrl: `${PUBLIC_URL}/${key}`,
      key,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to create presigned URL" },
      { status: 500 }
    );
  }
}
