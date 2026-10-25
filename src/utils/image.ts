// src/utils/image.ts

export const CLOUDINARY_CLOUD_NAME = "xmz5iwmo";
export const CLOUDINARY_UPLOAD_PRESET = "plantsmantra_uploads";

/**
 * Compresses an image file on the client side using HTML5 Canvas to WebP format
 * @param file The original image file
 * @param maxWidth The maximum width constraint
 * @param maxHeight The maximum height constraint
 * @param quality The compression quality (0 to 1)
 * @returns A Promise resolving to a compressed WebP Blob
 */
export const compressImage = (
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('File is not an image'));
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate scale factor to preserve aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file); // fallback to original file if 2d context is unsupported
        }

        // Draw image onto canvas with new dimensions
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas drawing to Blob using modern webp format at set quality
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              // Fallback to jpeg if webp is somehow unsupported
              canvas.toBlob(
                (jpegBlob) => resolve(jpegBlob || file),
                'image/jpeg',
                quality
              );
            }
          },
          'image/webp',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Uploads an image directly to Cloudinary Media Library using the unsigned upload preset
 * Bypasses Supabase Storage completely, ensuring 0 GB Supabase storage bandwidth.
 */
export const uploadToCloudinary = async (
  file: File | Blob,
  fallbackUpload?: () => Promise<string>
): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('Cloudinary upload warning:', err);
      if (fallbackUpload) return await fallbackUpload();
      throw new Error(err?.error?.message || 'Cloudinary upload failed');
    }

    const data = await res.json();
    return data.secure_url;
  } catch (error) {
    if (fallbackUpload) return await fallbackUpload();
    throw error;
  }
};
