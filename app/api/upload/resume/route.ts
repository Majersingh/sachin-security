// app/api/upload/resume/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/app/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log("Got request to upload resume");
    
    const formData = await request.formData();
    const file = formData.get('resume') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }
    
    // Validate file type
    const allowedTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Only PDF and DOC files are allowed' },
        { status: 400 }
      );
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }
    
    // Convert file to Base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    
    // we can Generate unique filename using time stamp
    const originalName = file.name.replace(/\s+/g, '_');
    const filename = `${originalName}`;
    
    // Store in MongoDB
    const collection = await getCollection('uploads');
    
    const uploadData = {
      filename,
      originalName: file.name,
      contentType: file.type,
      size: file.size,
      data: base64, // Store as Base64 string
      uploadedAt: new Date()
    };
    
    const result = await collection.insertOne(uploadData);
    
    console.log('File uploaded successfully:', filename);
    
    return NextResponse.json({
      success: true,
      message: 'Resume uploaded successfully',
      data: {
        fileId: result.insertedId.toString(),
        filename,
        originalName: file.name,
        size: file.size,
        type: file.type,
        url: `/api/download/resume/${result.insertedId.toString()}`
      }
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
