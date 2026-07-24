// src/utils/image.ts

/**
 * Compresses an image file on the client side using HTML5 Canvas
 * @param file The original image file
 * @param maxWidth The maximum width constraint
 * @param maxHeight The maximum height constraint
 * @param quality The compression quality (0 to 1)
 * @returns A Promise resolving to a compressed Blob
 */
export const compressImage = (
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.75
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

        // Convert canvas drawing to Blob using jpeg format at set quality
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file); // fallback to original file if blob conversion fails
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
