// components/ProfilePhotoUpload.tsx
'use client';

import { useState, useRef } from 'react';
import { Upload, Camera, Loader2, X, Check } from 'lucide-react';
import Image from 'next/image';

interface ProfilePhotoUploadProps {
  onUploadSuccess?: (photoUrl: string , filename:string ,isUploadedtoR2:string) => void;
  existingPhotoUrl?: string;
}

export default function ProfilePhotoUpload({ 
  onUploadSuccess,
  existingPhotoUrl 
}: ProfilePhotoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string>(''); // Local preview from file
  const [uploadedUrl, setUploadedUrl] = useState<string>(existingPhotoUrl || ''); // Uploaded URL
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPG, JPEG, and PNG files are allowed');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setError('');
    setSelectedFile(file);
    setUploadSuccess(false);
    // Create blob URL for immediate preview (much faster than FileReader)
    const blobUrl = URL.createObjectURL(file);
    setLocalPreview(blobUrl);
    console.log('Local preview URL:', blobUrl);

  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('profile', selectedFile);

      const response = await fetch('/api/upload/profile', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadSuccess(true);
        setUploadedUrl(data.data.url);
        
        // Call parent callback if provided
        if (onUploadSuccess) {
          onUploadSuccess(data.data.url , data.data.filename ,data.data.isUploadedtoR2);
        }

      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setLocalPreview('');
    setUploadedUrl('');
    setUploadSuccess(false);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  // Display priority: Local preview > Uploaded URL > Existing URL
  const displayImage = localPreview || uploadedUrl;

  return (
    <div className="w-full my-2 ">
      <div className="flex flex-col  w-full justify-between items-center  md:flex-row  bg-white border border-gray-200 rounded-lg p-2">
        <h3 className="text-lg text-gray-900 mb-4">
          Profile Photo <span className="text-red-500">*</span>
        </h3>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleBrowseClick}
            type="button"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            <Upload className="w-4 h-4" />
            {displayImage ? 'Change Photo' : 'Select Photo'}
          </button>

          {selectedFile && !uploadSuccess && (
            <button
              onClick={handleUpload}
              disabled={isUploading}
              type="button"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                   Upload Photo
                </>
              )}
            </button>
          )}
           {!uploadSuccess && (
              <p className="text-xs text-center text-amber-600 mt-1">
                ⚠️ Click "Upload Photo" to save this photo
              </p>
            )}
        </div>

        {/* Preview Area - Passport Size (35mm x 45mm ratio) */}
        <div className="flex flex-col items-center mb-4">
          <div className="relative w-[140px] h-[180px] border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
            {displayImage ? (
              <>
                <Image
                  src={displayImage}
                  height={180}
                  width={160}
                  alt="Profile preview"
                //   fill
                  className="object-cover"
                  unoptimized // Important for data URLs
                />
                {uploadSuccess && (
                  <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                    <div className="bg-green-500 rounded-full p-2">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                  </div>
                )}
                <button
                  onClick={handleRemove}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <Camera className="w-12 h-12 mb-2" />
                <p className="text-xs text-center px-2">Passport Size Photo</p>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {uploadSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-600">Photo uploaded successfully!</p>
          </div>
        )}

        {/* File Input (Hidden) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
