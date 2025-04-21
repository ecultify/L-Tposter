import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { Camera, Upload, RefreshCw, Loader2, AlertCircle, Info, SwitchCamera } from 'lucide-react';
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
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);

  // Redirect if not verified
  useEffect(() => {
    if (!isVerified && !userData.phoneNumber) {
      navigate('/');
    }
  }, [isVerified, userData.phoneNumber, navigate]);

  // Reset camera ready state when camera mode changes and add timeout detection
  useEffect(() => {
    if (mode === 'capture') {
      setIsCameraReady(false);
      console.log('Camera mode activated, initializing webcam with facing mode:', facingMode);
      
      // Add a timeout to detect if camera initialization is stuck
      const cameraTimeout = setTimeout(() => {
        if (!isCameraReady) {
          console.warn('Camera initialization timeout - not ready after 10 seconds');
          // Try to reset by toggling camera mode
          if (isMobile) {
            toggleCameraFacing();
          }
          setError('Camera initialization is taking too long. Try switching cameras or refreshing the page.');
        }
      }, 10000);
      
      return () => clearTimeout(cameraTimeout);
    }
  }, [mode, facingMode, isCameraReady, isMobile]);

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

        // Try to list all available media devices first
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          console.log('Available video devices:', videoDevices);
          
          if (videoDevices.length === 0) {
            console.log('No video devices found');
            setHasCamera(false);
            setIsCheckingCamera(false);
            return;
          }
        } catch (enumError) {
          console.log('Could not enumerate devices:', enumError);
          // Continue with getUserMedia anyway as some browsers require permission first
        }

        // Request camera permission to ensure we can access it
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true,
            audio: false
          });
          setHasCamera(true);
          
          // Release the stream immediately
          stream.getTracks().forEach(track => track.stop());
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

  // Detect if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      setIsMobile(mobileRegex.test(userAgent.toLowerCase()));
    };
    
    checkMobile();
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
    if (!file) {
      setError("No file selected. Please try again.");
      return;
    }
    
    // Reset any previous warnings
    setImageQualityWarning(null);
    setError(null);
    
    // Check if file is an image
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml'];
    if (!validImageTypes.includes(file.type)) {
      setError(`Unsupported file type: ${file.type}. Please upload a JPG, PNG, GIF, WebP, BMP, TIFF, or SVG image.`);
      return;
    }
    
    // Check file size - max 10MB
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds 10MB. Please choose a smaller image.`);
      return;
    }
    
    // Show a loading message
    setImage('loading');
    
    const reader = new FileReader();
    
    // Add a timeout for very large files
    const readerTimeout = setTimeout(() => {
      if (reader.readyState !== 2) { // DONE state
        reader.abort();
        setError("Reading the file is taking too long. The file may be too large. Please try a smaller image.");
        setImage(null);
      }
    }, 15000); // 15 second timeout
    
    reader.onloadend = () => {
      clearTimeout(readerTimeout);
      
      if (!reader.result) {
        setError("Failed to read the image file. Please try again with a different file.");
        setImage(null);
        return;
      }
      
      const imageSrc = reader.result as string;
      
      // Pre-load the image to ensure it's fully loaded before setting it
      const img = new Image();
      
      // Handle timeouts for large images
      const imageLoadTimeout = setTimeout(() => {
        if (!img.complete) {
          setError("Image is taking too long to load. It may be too large or corrupted. Please try a different image.");
          setImage(null);
        }
      }, 10000); // 10 second timeout
      
      img.onload = () => {
        clearTimeout(imageLoadTimeout);
        
        // Check if the image is too small (less than 100x100)
        if (img.width < 100 || img.height < 100) {
          setError("Image is too small. Please upload a larger image for better results.");
          setImage(null);
          return;
        }
        
        // Check if the image is too large (more than 4000x4000)
        if (img.width > 4000 || img.height > 4000) {
          // We'll still use it, but warn the user
          setImageQualityWarning("Image is very large and may cause performance issues.");
        }
        
        // Set the image and check quality
        setImage(imageSrc);
        checkImageQuality(imageSrc);
      };
      
      img.onerror = () => {
        clearTimeout(imageLoadTimeout);
        setError("Failed to load the image. The file may be corrupted or not a valid image. Please try another file.");
        setImage(null);
      };
      
      img.src = imageSrc;
    };
    
    reader.onerror = () => {
      clearTimeout(readerTimeout);
      console.error("FileReader error:", reader.error);
      setError(`Failed to read the image file: ${reader.error?.message || 'Unknown error'}. Please try again with a different file.`);
      setImage(null);
    };
    
    // Start reading the file
    try {
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error reading file:", error);
      setError(`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}. Please try a different file.`);
      setImage(null);
    }
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
      console.log('Attempting to initialize camera with facing mode:', facingMode);
      
      // Explicitly request camera permissions with more detailed constraints
      const constraints = { 
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 1920 }
        }, 
        audio: false 
      };
      
      navigator.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
          console.log('Camera permission granted:', stream.getVideoTracks().map(t => t.label));
          // Release the stream to avoid conflicts with Webcam component
          stream.getTracks().forEach(track => track.stop());
          setMode('capture');
          setIsCheckingCamera(false);
        })
        .catch((err) => {
          console.error('Detailed camera access error:', err.name, err.message);
          // Try again with simpler constraints
          console.log('Trying with simplified constraints');
          navigator.mediaDevices.getUserMedia({ video: true })
            .then((stream) => {
              console.log('Camera access successful with basic constraints');
              // Release the stream to avoid conflicts with Webcam component
              stream.getTracks().forEach(track => track.stop());
              setMode('capture');
              setIsCheckingCamera(false);
            })
            .catch((fallbackErr) => {
              console.error('Fallback camera access error:', fallbackErr.name, fallbackErr.message);
              setHasCamera(false);
              setMode('upload');
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
              setError('Camera access denied. Please upload a photo instead.');
              setIsCheckingCamera(false);
            });
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

      // Show processing status to user
      setError('Processing your image. This may take a moment...');

      // Call remove.bg API through our service
      const bgRemovalResponse = await removeBackground(blob);

      if (!bgRemovalResponse.success) {
        throw new Error(bgRemovalResponse.error || 'Failed to process image');
      }

      // Clear processing message
      setError(null);

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

  // Function to toggle between front and back cameras
  const toggleCameraFacing = () => {
    setIsCameraReady(false); // Reset camera ready status
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    
    // Force webcam to reconnect with new facing mode
    if (webcamRef.current) {
      // Small delay to ensure state updates before reconnecting
      setTimeout(() => {
        if (webcamRef.current) {
          // Attempt to reset the connection
          const video = webcamRef.current.video;
          if (video && video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
          }
        }
      }, 300);
    }
  };

  // Function to handle webcam ready state
  const handleUserMedia = () => {
    console.log('Camera stream connected successfully');
    setIsCameraReady(true);
    setError(null);
  };

  // Function to handle webcam errors
  const handleWebcamError = (error: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('Webcam component error:', error);
    setError('Camera could not be initialized. You may need to grant camera permissions or try a different browser.');
    setIsCameraReady(false);
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
                  accept="image/jpeg,image/png,image/gif,image/webp,image/bmp,image/tiff,image/svg+xml"
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
                <div className="aspect-[3/4] mx-auto relative max-w-md">
                  {!isCameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded-lg z-10">
                      <div className="text-center">
                        <Loader2 className="mx-auto h-8 w-8 text-blue-600 animate-spin" />
                        <p className="mt-2 text-sm text-white">Starting camera...</p>
                      </div>
                    </div>
                  )}
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ 
                      facingMode: facingMode,
                      width: { ideal: 1280 },
                      height: { ideal: 1920 }
                    }}
                    className="w-full h-full rounded-lg object-cover"
                    onUserMedia={handleUserMedia}
                    onError={handleWebcamError}
                    mirrored={facingMode === 'user'}
                    forceScreenshotSourceSize={true}
                    screenshotQuality={0.92}
                  />
                  {/* Body silhouette guide overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <svg width="80%" height="90%" viewBox="0 0 200 400" className="text-white opacity-50">
                      {/* Head */}
                      <circle cx="100" cy="70" r="40" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="5,5" />
                      {/* Shoulders and body shape */}
                      <path d="M 60,120 C 60,150 60,180 60,220 C 60,280 140,280 140,220 C 140,180 140,150 140,120" 
                        fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="5,5" />
                      {/* Center line for alignment */}
                      <line x1="100" y1="0" x2="100" y2="400" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
                    </svg>
                  </div>
                  
                  {/* Position guidance message */}
                  <div className="absolute top-2 left-0 right-0 text-center bg-black bg-opacity-70 text-white py-2 text-sm rounded-t">
                    Position your {facingMode === 'user' ? 'face' : 'subject'} within the outline
                  </div>
                  
                  {/* Camera troubleshooting hint */}
                  {isCameraReady && isMobile && (
                    <div className="absolute bottom-2 left-0 right-0 text-center bg-black bg-opacity-70 text-white py-1 text-xs rounded-b">
                      Not seeing video? Try tapping the switch camera button
                    </div>
                  )}
                </div>
                
                {!isCameraReady && mode === 'capture' && (
                  <div className="mt-2 flex justify-center gap-4">
                    <button
                      onClick={() => {
                        console.log('Manual camera reset requested');
                        if (isMobile) {
                          toggleCameraFacing();
                        } else {
                          setMode(null);
                          setTimeout(() => setMode('capture'), 500);
                        }
                      }}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" /> Retry camera
                    </button>
                    
                    <button
                      onClick={() => {
                        console.log('Switching to upload mode from failed camera');
                        setMode('upload');
                      }}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <Upload className="h-4 w-4 mr-1" /> Switch to upload
                    </button>
                  </div>
                )}
                
                {isMobile ? (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleCapture}
                      className="flex-1 flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Capture Photo
                    </button>
                    <button
                      onClick={toggleCameraFacing}
                      className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      title={`Switch to ${facingMode === 'user' ? 'back' : 'front'} camera`}
                    >
                      <SwitchCamera className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleCapture}
                    className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Capture Photo
                  </button>
                )}
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
                    JPG, PNG, GIF, WebP, BMP, TIFF, SVG up to 10MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/bmp,image/tiff,image/svg+xml"
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
                  {error && error.includes('Processing') ? 'Removing Background...' : 'Processing...'}
                </>
              ) : (
                'Continue with this Photo'
              )}
            </button>
            {isProcessing && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Background removal may take a few moments. Please be patient.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoCapturePage;