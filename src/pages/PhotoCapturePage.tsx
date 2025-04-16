import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { Camera, Upload, RefreshCw, Loader2 } from 'lucide-react';

const PhotoCapturePage = () => {
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam | null>(null);
  const [mode, setMode] = useState<'upload' | 'capture' | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [isCheckingCamera, setIsCheckingCamera] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setImage(imageSrc);
    }
  }, [webcamRef]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
    if (!image) return;

    setIsProcessing(true);
    setError(null);
    
    try {
      // First, extract the base64 data from the data URL
      const base64Data = image.split(',')[1];
      const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(res => res.blob());

      // Create form data for the API request
      const formData = new FormData();
      formData.append('image_file', blob);
      formData.append('size', 'auto');
      formData.append('format', 'png');

      // Call remove.bg API to remove background
      const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': 'VmEeChTnKgAvW7NVH1bYrQC1',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to process image: ${response.statusText}`);
      }

      // Convert the response to a blob and then to a data URL
      const processedImageBlob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const processedImageDataUrl = reader.result as string;
        
        // Store both the original and processed images in session storage
        const imageData = {
          original: image,
          processed: processedImageDataUrl
        };
        
        sessionStorage.setItem('userImages', JSON.stringify(imageData));
        
        // Navigate to the poster generator page
        navigate('/generate');
      };
      
      reader.readAsDataURL(processedImageBlob);
    } catch (error) {
      console.error('Error processing image:', error);
      setError('There was an error processing your image. Please try again.');
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

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
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
                <button
                  onClick={() => setMode('upload')}
                  className="w-full flex items-center justify-center px-4 py-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
                >
                  <Upload className="mr-2" /> Upload a Photo
                </button>
              </>
            )}
          </div>
        )}

        {mode === 'capture' && !image && (
          <div className="bg-white p-8 rounded-lg shadow">
            {isCheckingCamera ? (
              <div className="text-center py-8">
                <Loader2 className="mx-auto h-8 w-8 text-blue-600 animate-spin" />
                <p className="mt-2 text-sm text-gray-600">Accessing your camera...</p>
              </div>
            ) : hasCamera ? (
              <>
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="w-full rounded-lg"
                  onUserMediaError={(err) => {
                    console.error('Webcam error:', err);
                    setError('Could not access your camera. Please try uploading a photo instead.');
                    setHasCamera(false);
                    setMode('upload');
                    if (fileInputRef.current) {
                      fileInputRef.current.click();
                    }
                  }}
                />
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={handleCapture}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Capture Photo
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">Camera not available. Please upload a photo instead.</p>
                <button
                  onClick={() => setMode('upload')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Upload Photo
                </button>
              </div>
            )}
          </div>
        )}

        {mode === 'upload' && !image && (
          <div className="bg-white p-8 rounded-lg shadow">
            <label className="block text-center cursor-pointer">
              <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">Click to upload a photo</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {image && (
          <div className="bg-white p-8 rounded-lg shadow space-y-4">
            <img src={image} alt="Preview" className="w-full rounded-lg" />
            <div className="flex justify-between">
              <button
                onClick={() => {
                  setImage(null);
                  setError(null);
                  setMode(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Retake
              </button>
              <button
                onClick={processImage}
                disabled={isProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="inline-block animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoCapturePage;