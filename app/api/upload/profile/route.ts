import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/app/lib/r2";

export async function POST(request: NextRequest) {
  try {
    console.log("Got request to upload PROFILE");

    const formData = await request.formData();
    const file = formData.get("profile") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Validate type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Only JPG, JPEG, PNG files are allowed." },
        { status: 400 }
      );
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    // Convert to buffer (Edge-safe)
    const buffer = new Uint8Array(await file.arrayBuffer());

    // ✅ Edge-safe unique filename
    const ext = file.name.split(".").pop();
    const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
    const r2Key = `profiles/${uniqueId}.${ext}`;

    // Upload to R2
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: r2Key,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const fileUrl = `${process.env.R2_PUBLIC_URL}/${r2Key}`;

    console.log("Profile uploaded successfully:", r2Key);

    // 🔁 SAME RESPONSE FORMAT
    return NextResponse.json({
      success: true,
      message: "Profile uploaded successfully",
      data: {
        isUploadedtoR2:true,
        fileId: r2Key,        // ⬅️ R2 key
        filename: r2Key,
        originalName: file.name,
        size: file.size,
        type: file.type,
        url: fileUrl,         // ⬅️ R2 URL
      },
    });
  } catch (error: any) {
    console.error("Profile Upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
