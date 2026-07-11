import { useState, useCallback } from 'react';

export function useCamera() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoHash, setPhotoHash] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  // Fast hash of the image data segment to detect duplicate uploads
  const calculateHash = async (base64Str: string): Promise<string> => {
    try {
      // Encode a unique sample (the last 2000 characters) to be computationally cheap but unique
      const sample = base64Str.slice(-2000);
      const msgUint8 = new TextEncoder().encode(sample);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // Fallback pseudo-hash
      return 'hash-' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
  };

  const processFile = useCallback(async (file: File): Promise<{ base64: string; hash: string }> => {
    setCompressing(true);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
            }

            // Compress to JPEG with 70% quality
            const base64 = canvas.toDataURL('image/jpeg', 0.7);
            const hash = await calculateHash(base64);
            
            setPhoto(base64);
            setPhotoHash(hash);
            setCompressing(false);
            resolve({ base64, hash });
          } catch (err) {
            setCompressing(false);
            reject(err);
          }
        };
        img.onerror = () => {
          setCompressing(false);
          reject(new Error('Failed to load image file.'));
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        setCompressing(false);
        reject(new Error('Failed to read image file.'));
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const clearPhoto = useCallback(() => {
    setPhoto(null);
    setPhotoHash(null);
  }, []);

  return { photo, photoHash, compressing, processFile, clearPhoto, setPhoto, setPhotoHash };
}
