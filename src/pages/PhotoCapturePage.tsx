import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { Camera, Upload, RefreshCw, Loader2, AlertCircle, Info } from 'lucide-react';
import { useFormData } from '../context/FormDataContext';
import { removeBackground } from '../services/api';

const PhotoCapturePage = () => {
  const navigate = useNavigate();
  const { isVerified, userData, setProcessedImage } = useFormData();
  const webcamRef = useRef<Webcam | null>(null);
  const [mode, setMode] = useState<'upload' | 'capture' | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [isCheckingCamera, setIsCheckingCamera] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageQualityWarning, setImageQualityWarning] = useState<string | null>(null);

  // Redirect if not verified
  useEffect(() => {
    if (!isVerified && !userData.phoneNumber) {
      navigate('/');
    }
  }, [isVerified, userData.phoneNumber, navigate]);

  // Check if device has a camera
  useEffect(() => {
    const checkCamera = async () => {
      setIsCheckingCamera(true);
      try {
        // First check if mediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          console.log('MediaDevices API not available');
          setHasCamera(false);
          setIsCheckingCamera(false);
          return;
        }

        // Request camera permission to ensure we can access it
        try {
          await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCamera(true);
        } catch (permissionErr) {
          console.log('Camera permission denied or not available:', permissionErr);
          setHasCamera(false);
        }
      } catch (err) {
        console.error('Error checking for camera:', err);
        setHasCamera(false);
      } finally {
        setIsCheckingCamera(false);
      }
    };

    checkCamera();
  }, []);

  const handleCapture = React.useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setImage(imageSrc);
        // Reset any previous warnings
        setImageQualityWarning(null);
        // Check image quality
        checkImageQuality(imageSrc);
      }
    }
  }, [webcamRef]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Reset any previous warnings
    setImageQualityWarning(null);
    setError(null);
    
    // Check file size - max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB. Please choose a smaller image.');
      return;
    }
    
    // Show a loading message
    setImage('loading');
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageSrc = reader.result as string;
      
      // Pre-load the image to ensure it's fully loaded before setting it
      const img = new Image();
      img.onload = () => {
        setImage(imageSrc);
        // Check image quality
        checkImageQuality(imageSrc);
      };
      img.onerror = () => {
        setError('Failed to load the image. Please try another file.');
        setImage(null);
      };
      img.src = imageSrc;
    };
    
    reader.onerror = () => {
      setError('Failed to read the image file. Please try again.');
      setImage(null);
    };
    
    reader.readAsDataURL(file);
  };

  const checkImageQuality = (imageSrc: string) => {
    // Create an image element to check dimensions
    const img = new Image();
    img.onload = () => {
      // Check if image is too small
      if (img.width < 300 || img.height < 300) {
        setImageQualityWarning('The image resolution is quite low. This may affect the quality of your poster.');
      }
      
      // Check if image is square (avatar-like) which might not be ideal for the poster
      const aspectRatio = img.width / img.height;
      if (aspectRatio > 0.9 && aspectRatio < 1.1) {
        setImageQualityWarning('Square images may not position well in the poster. Consider using a full-body photo.');
      }
      
      // Check if image is extremely wide or tall
      if (aspectRatio > 2 || aspectRatio < 0.5) {
        setImageQualityWarning('The image proportion is unusual. For best results, use a standard portrait photo.');
      }
    };
    img.src = imageSrc;
  };

  const handleSelfieClick = () => {
    if (hasCamera === false) {
      // If no camera is available, automatically switch to upload mode
      setMode('upload');
      // Trigger file input click
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } else if (hasCamera === null) {
      // If we're still checking for camera, show a loading state
      setError('Checking camera availability...');
      // Wait a moment and then check again
      setTimeout(() => {
        if (hasCamera === false) {
          setMode('upload');
          if (fileInputRef.current) {
            fileInputRef.current.click();
          }
        } else {
          setMode('capture');
        }
        setError(null);
      }, 1000);
    } else {
      // Try to access the camera again to ensure permissions are still valid
      setIsCheckingCamera(true);
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => {
          setMode('capture');
          setIsCheckingCamera(false);
        })
        .catch((err) => {
          console.error('Camera access error:', err);
          setHasCamera(false);
          setMode('upload');
          if (fileInputRef.current) {
            fileInputRef.current.click();
          }
          setError('Camera access denied. Please upload a photo instead.');
          setIsCheckingCamera(false);
        });
    }
  };

  const processImage = async () => {
    if (!image || image === 'loading') {
      setError('Please wait for the image to fully load or select another image.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      // First, ensure the image is fully loaded
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = image;
      });
      
      // Convert image URL directly to blob
      const response = await fetch(image);
      const blob = await response.blob();

      // Call remove.bg API through our service
      const bgRemovalResponse = await removeBackground(blob);

      if (!bgRemovalResponse.success) {
        throw new Error(bgRemovalResponse.error || 'Failed to process image');
      }

      // Save both original and processed images to context
      setProcessedImage({
        original: image,
        processed: bgRemovalResponse.data as string
      });
      
      // Navigate to the poster generator page
      navigate('/generate');
    } catch (error) {
      console.error('Error processing image:', error);
      setError('There was an error processing your image. Please try again with a clearer photo with a simple background.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Camera className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Add Your Photo</h2>
          <p className="mt-2 text-sm text-gray-600">
            Take a selfie or upload a photo for your business poster
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-6 flex items-start">
          <Info className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Photo Guidance</p>
            <ul className="text-sm list-disc list-inside mt-1">
              <li>For best results, use a standing photo with a clear background</li>
              <li>Face forward, similar to an ID photo</li>
              <li>Ensure good lighting to help with background removal</li>
              <li>Your image will be positioned next to Bumrah in the poster</li>
            </ul>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {imageQualityWarning && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded mb-6 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {imageQualityWarning}
          </div>
        )}

        {!mode && (
          <div className="bg-white p-8 rounded-lg shadow space-y-4">
            {isCheckingCamera ? (
              <div className="text-center py-8">
                <Loader2 className="mx-auto h-8 w-8 text-blue-600 animate-spin" />
                <p className="mt-2 text-sm text-gray-600">Checking camera availability...</p>
              </div>
            ) : (
              <>
                <button
                  onClick={handleSelfieClick}
                  className="w-full flex items-center justify-center px-4 py-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
                >
                  <Camera className="mr-2" /> Take a Selfie
                </button>
                <div className="text-center">or</div>
                <button
                  onClick={() => {
                    setMode('upload');
                  }}
                  className="w-full flex items-center justify-center px-4 py-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
                >
                  <Upload className="mr-2" /> Upload a Photo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </>
            )}
          </div>
        )}

        {mode === 'capture' && (
          <div className="bg-white p-6 rounded-lg shadow space-y-4">
            {image ? (
              <div className="relative">
                <img
                  src={image}
                  alt="Captured"
                  className="w-full rounded-lg"
                />
                <button
                  onClick={() => setImage(null)}
                  className="mt-4 flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Retake
                </button>
              </div>
            ) : (
              <div className="relative">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: 'user' }}
                  className="w-full rounded-lg"
                />
                <button
                  onClick={handleCapture}
                  className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Capture Photo
                </button>
              </div>
            )}
          </div>
        )}

        {mode === 'upload' && (
          <div className="bg-white p-6 rounded-lg shadow space-y-4">
            {image ? (
              image === 'loading' ? (
                <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                  <Loader2 className="animate-spin h-10 w-10 text-blue-600" />
                  <span className="ml-3">Loading image...</span>
                </div>
              ) : (
                <div>
                  <img
                    src={image}
                    alt="Uploaded"
                    className="w-full rounded-lg"
                  />
                  <button
                    onClick={() => setImage(null)}
                    className="mt-4 flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Upload className="mr-2 h-4 w-4" /> Upload Different Photo
                  </button>
                </div>
              )
            ) : (
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg px-6 py-10 text-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-2">
                  <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                    Click to upload
                  </span>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            )}
          </div>
        )}

        {image && image !== 'loading' && (
          <div className="mt-6">
            <button
              onClick={processImage}
              disabled={isProcessing}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Processing...
                </>
              ) : (
                'Continue with this Photo'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoCapturePage;