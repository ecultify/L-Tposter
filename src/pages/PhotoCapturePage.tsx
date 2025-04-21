import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { Camera, Upload, RefreshCw, Loader2, AlertCircle, Info, SwitchCamera, Sparkles, User, UserRound } from 'lucide-react';
import { useFormData } from '../context/FormDataContext';
import { removeBackground, generateAIImage, createProfessionalBodyShot } from '../services/api';

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
  const [showGuidelines, setShowGuidelines] = useState<boolean>(false);
  const [isWellPositioned, setIsWellPositioned] = useState<boolean>(false);
  // New state variables for AI image generation
  const [isGeneratingAIImage, setIsGeneratingAIImage] = useState<boolean>(false);
  const [aiGeneratedImage, setAiGeneratedImage] = useState<string | null>(null);
  // Add a state for tracking if camera is switching
  const [isSwitchingCamera, setIsSwitchingCamera] = useState<boolean>(false);
  // Add a state to indicate whether we're using selfie or photo mode (front vs back camera purpose)
  const [captureMode, setCaptureMode] = useState<'selfie' | 'photo'>('selfie');

  // CSS for vertical camera layout
  const cameraStyles = {
    container: {
      position: 'relative',
      width: '100%',
      maxWidth: '340px', // Reduced from 400px for more portable size
      marginLeft: 'auto',
      marginRight: 'auto',
      overflow: 'hidden',
      backgroundColor: '#f0f0f0', // Added to show camera container even when camera isn't loaded yet
      minHeight: '400px', // Added to ensure container has height before camera loads
    },
    webcam: {
      width: '100%',
      height: 'auto',
      aspectRatio: '3/4', // More extreme portrait orientation (vertical)
      objectFit: 'cover',
      borderRadius: '8px',
    },
    guidelines: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
    },
    positionOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      pointerEvents: 'none',
    },
    silhouette: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '75%', // Reduced from 80%
      height: '60%', // Reduced from 70%
      borderRadius: '50% 50% 45% 45% / 60% 60% 40% 40%', // Head and shoulders shape
      border: '2px dashed rgba(255, 255, 255, 0.7)',
      pointerEvents: 'none',
    },
    statusIndicator: {
      position: 'absolute',
      bottom: '15px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '4px 12px',
      borderRadius: '16px',
      fontSize: '12px',
      fontWeight: 'bold',
      pointerEvents: 'none',
    },
    wellPositioned: {
      backgroundColor: 'rgba(0, 200, 0, 0.7)',
      color: 'white',
    },
    notPositioned: {
      backgroundColor: 'rgba(200, 200, 200, 0.7)',
      color: 'white',
    },
    cameraLoadingIndicator: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      color: '#666',
      textAlign: 'center',
    }
  };

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

  // Face detection to check if user is well positioned (simulated)
  useEffect(() => {
    if (mode === 'capture' && !image && webcamRef.current && webcamRef.current.video) {
      // This is a simple timer to simulate face detection
      // In a real application, you would use a face detection library
      const timer = setInterval(() => {
        // Randomly toggle positioning for demo purposes
        // In a real app, use face detection to check if face is within the silhouette
        setIsWellPositioned(Math.random() > 0.3);
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [mode, image]);

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

  // Toggle camera guidelines
  const toggleGuidelines = () => {
    setShowGuidelines(!showGuidelines);
  };

  // Function to toggle between front and back cameras
  const toggleCameraFacing = async () => {
    if (isSwitchingCamera) return; // Prevent multiple rapid switches
    
    try {
      setIsSwitchingCamera(true);
      setError(null);
      
      // First, stop any existing streams to release the current camera
      if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.srcObject) {
        const stream = webcamRef.current.video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Set new facing mode
      const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(newFacingMode);
      
      // Update capture mode based on camera facing
      setCaptureMode(newFacingMode === 'user' ? 'selfie' : 'photo');
      
      // Add a small delay to ensure camera resources are properly released
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Explicitly request the new camera with more detailed constraints
      try {
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: newFacingMode },
            width: { ideal: 720 },
            height: { ideal: 1080 },
            aspectRatio: { ideal: 0.75 } // 3:4 aspect ratio for portrait
          },
          audio: false
        });
      } catch (constraintErr) {
        console.log('Failed with exact constraint, falling back to simple mode');
        // Fall back to simpler constraints if exact mode fails
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: newFacingMode,
            width: { ideal: 720 },
            height: { ideal: 1080 }
          },
          audio: false
        });
      }
    } catch (err) {
      console.error('Error switching camera:', err);
      setError('Failed to switch camera. Please try again.');
    } finally {
      // Add a slight delay before allowing another switch
      setTimeout(() => {
        setIsSwitchingCamera(false);
      }, 1000);
    }
  };

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
      
      // Explicitly request camera permissions with more detailed constraints
      // Use portrait orientation for mobile (height > width)
      const constraints = { 
        video: {
          facingMode: facingMode,
          width: { ideal: 720 },
          height: { ideal: 1080 }, // Make height larger than width for portrait
          aspectRatio: { ideal: 0.75 } // Updated to match our 3:4 aspect ratio
        }, 
        audio: false 
      };
      
      navigator.mediaDevices.getUserMedia(constraints)
        .then(() => {
          setMode('capture');
          setIsCheckingCamera(false);
        })
        .catch((err) => {
          console.error('Camera access error:', err);
          // Try again with simpler constraints
          navigator.mediaDevices.getUserMedia({ video: true })
            .then(() => {
              setMode('capture');
              setIsCheckingCamera(false);
            })
            .catch(() => {
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
    console.log('Starting image processing...');
    
    try {
      // First, ensure the image is fully loaded
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = image;
      });
      
      console.log('Image loaded successfully');
      
      // Convert image URL directly to blob
      const response = await fetch(image);
      const blob = await response.blob();

      // Show processing status to user
      setError('Processing your image. This may take a moment...');
      console.log('Image converted to blob, size:', blob.size);

      // If this is a selfie (front camera) handle it
      if (captureMode === 'selfie') {
        try {
          // Set the processing flag to show the loading UI
          setIsGeneratingAIImage(true);
          console.log('Starting selfie processing...');
          
          // Remove the background from the selfie
          setError('Removing background from selfie...');
          console.log('Starting background removal...');
          const backgroundRemovedResponse = await removeBackground(blob);
          
          if (!backgroundRemovedResponse.success) {
            throw new Error(backgroundRemovedResponse.error || 'Failed to remove background from selfie');
          }
          
          console.log('Background removal successful');
          
          // Get the background-removed image URL
          const bgRemovedImageUrl = backgroundRemovedResponse.data as string;
          
          // Store the background-removed image
          setAiGeneratedImage(bgRemovedImageUrl);
          console.log('Background-removed image stored');
          
          // Simulate a second processing step for UI consistency
          setError('Processing image...');
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Important: Wait for this to complete before navigation
          await new Promise<void>(resolve => {
            // Save the processed image to context
            console.log('Saving final image to context');
            setProcessedImage({
              original: image,
              processed: bgRemovedImageUrl
            });
            
            // Give React time to update the context before navigating
            setTimeout(resolve, 500);
          });
          
          console.log('Context updated with final image');
        } finally {
          // Make sure to reset the AI generation flag
          setIsGeneratingAIImage(false);
        }
      } else {
        // Regular photo processing (back camera or uploaded image)
        // Call remove.bg API through our service
        console.log('Starting background removal for regular photo...');
        const bgRemovalResponse = await removeBackground(blob);

        if (!bgRemovalResponse.success) {
          throw new Error(bgRemovalResponse.error || 'Failed to process image');
        }

        console.log('Background removal successful');
        
        // Wait for the context to be updated with the processed image
        await new Promise<void>(resolve => {
          // Save both original and processed images to context
          console.log('Saving processed image to context');
          setProcessedImage({
            original: image,
            processed: bgRemovalResponse.data as string
          });
          
          // Give React time to update the context before navigating
          setTimeout(resolve, 500);
        });
        
        console.log('Context updated with processed image');
      }
      
      // Clear processing message
      setError(null);
      
      // Navigate to the poster generator page
      console.log('Navigation to poster generator page');
      navigate('/generate');
    } catch (error) {
      console.error('Error processing image:', error);
      setError('There was an error processing your image. Please try again with a clearer photo with a simple background.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Fix the camera loading indicator
  useEffect(() => {
    if (mode === 'capture') {
      // Set up a timer to check if video is actually playing
      const checkVideoPlaying = setInterval(() => {
        if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
          // Video is ready and playing (readyState 4 means HAVE_ENOUGH_DATA)
          const loadingIndicator = document.querySelector('[style*="cameraLoadingIndicator"]');
          if (loadingIndicator) {
            (loadingIndicator as HTMLElement).style.display = 'none';
          }
          clearInterval(checkVideoPlaying);
        }
      }, 250); // Check every 250ms
      
      // Clear the interval when component unmounts or mode changes
      return () => clearInterval(checkVideoPlaying);
    }
  }, [mode]);

  // Add a component for photo requirements with visual examples
  const PhotoRequirements = () => (
    <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
      <h4 className="font-medium text-sm mb-2 text-gray-700 flex items-center">
        <Info className="h-4 w-4 mr-1 text-blue-500" />
        Photo Requirements
      </h4>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-3">
        <div className="flex-1 text-center">
          <div className="border border-green-500 rounded-lg p-1 mb-1 bg-white">
            <img 
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces" 
              alt="Good example" 
              className="w-full h-auto rounded object-cover aspect-square"
            />
          </div>
          <span className="text-xs text-green-600 font-medium flex items-center justify-center">
            <span className="bg-green-100 text-green-700 rounded-full w-4 h-4 inline-flex items-center justify-center mr-1">✓</span>
            Good photo
          </span>
        </div>
        
        <div className="flex-1 text-center">
          <div className="border border-red-500 rounded-lg p-1 mb-1 bg-white">
            <img 
              src="https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=200&h=200&fit=crop" 
              alt="Bad example" 
              className="w-full h-auto rounded object-cover aspect-square"
            />
          </div>
          <span className="text-xs text-red-600 font-medium flex items-center justify-center">
            <span className="bg-red-100 text-red-700 rounded-full w-4 h-4 inline-flex items-center justify-center mr-1">✗</span>
            Bad photo
          </span>
        </div>
      </div>
      
      <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
        <li>Face should be clearly visible and well-lit</li>
        <li>Use a plain or simple background if possible</li>
        <li>Look directly at the camera with neutral expression</li>
        <li>Avoid wearing hats, sunglasses or heavy accessories</li>
        <li>Ensure your face takes up at least 60% of the frame</li>
      </ul>
      
      <div className="flex justify-between mt-3 text-xs">
        <div className="flex flex-col items-center">
          <div className="bg-green-100 rounded-lg p-1 w-14 h-14 flex items-center justify-center mb-1">
            <img 
              src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=faces" 
              alt="Well lit" 
              className="w-full h-full object-cover rounded"
            />
          </div>
          <span className="text-green-600">Well lit</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="bg-green-100 rounded-lg p-1 w-14 h-14 flex items-center justify-center mb-1">
            <img 
              src="https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?w=100&h=100&fit=crop&crop=faces" 
              alt="Neutral expression" 
              className="w-full h-full object-cover rounded"
            />
          </div>
          <span className="text-green-600">Neutral</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="bg-green-100 rounded-lg p-1 w-14 h-14 flex items-center justify-center mb-1">
            <img 
              src="https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=100&h=100&fit=crop&crop=faces" 
              alt="Plain background" 
              className="w-full h-full object-cover rounded"
            />
          </div>
          <span className="text-green-600">Plain BG</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Camera className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Add Your Photo</h2>
          <p className="mt-2 text-sm text-gray-600">
            {captureMode === 'selfie' 
              ? 'Take a selfie to create a professional business portrait' 
              : 'Take a photo or upload an image for your business poster'}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-6 flex items-start">
          <Info className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Photo Guidance</p>
            {captureMode === 'selfie' ? (
              <ul className="text-sm list-disc list-inside mt-1">
                <li>Position your face within the guide outline</li>
                <li>We'll use AI to create a professional portrait from your selfie</li>
                <li>Look directly at the camera for best results</li>
                <li>Ensure good lighting on your face</li>
              </ul>
            ) : (
              <ul className="text-sm list-disc list-inside mt-1">
                <li>Position your photo subject within the guide</li>
                <li>Ensure the entire subject is visible in the frame</li>
                <li>Ensure good lighting to help with background removal</li>
                <li>Use a simple background for best results</li>
              </ul>
            )}
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
                  onClick={() => {
                    setFacingMode('user');
                    setCaptureMode('selfie');
                    handleSelfieClick();
                  }}
                  className="w-full flex items-center justify-center px-4 py-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
                >
                  <UserRound className="mr-2" /> Take a Selfie 
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    AI Enhanced
                  </span>
                </button>
                <div className="text-center">or</div>
                <button
                  onClick={() => {
                    setFacingMode('environment');
                    setCaptureMode('photo');
                    handleSelfieClick();
                  }}
                  className="w-full flex items-center justify-center px-4 py-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
                >
                  <Camera className="mr-2" /> Take a Photo
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

                <PhotoRequirements />
              </>
            )}
          </div>
        )}

        {mode === 'capture' && (
          <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <div className="border-b pb-2 mb-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {captureMode === 'selfie' ? 'Selfie Mode' : 'Photo Mode'}
                </h3>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  captureMode === 'selfie' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {captureMode === 'selfie' 
                    ? 'AI Enhancement Available' 
                    : 'Standard Mode'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {captureMode === 'selfie'
                  ? 'We\'ll transform your selfie into a professional portrait'
                  : 'Your photo will be used as-is with background removal only'}
              </p>
            </div>

            {image ? (
              <div className="relative">
                <img
                  src={image}
                  alt="Captured"
                  className="w-full rounded-lg"
                  style={{ maxHeight: '70vh', objectFit: 'contain' }}
                />
                <button
                  onClick={() => setImage(null)}
                  className="mt-4 flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Retake
                </button>
              </div>
            ) : (
              <>
                <div style={cameraStyles.container as React.CSSProperties}>
                  {/* Camera loading indicator */}
                  <div style={cameraStyles.cameraLoadingIndicator as React.CSSProperties}>
                    <Loader2 className="mx-auto h-8 animate-spin mb-2" />
                    <p>Activating camera...</p>
                  </div>
                  
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ 
                      facingMode: facingMode,
                      width: { ideal: 720 },
                      height: { ideal: 1080 },
                      aspectRatio: { ideal: 0.75 } // 3:4 aspect ratio for portrait
                    }}
                    style={cameraStyles.webcam as React.CSSProperties}
                    onUserMedia={() => {
                      // Hide the loading indicator when camera is ready
                      const loadingIndicator = document.querySelector('[style*="cameraLoadingIndicator"]');
                      if (loadingIndicator) {
                        (loadingIndicator as HTMLElement).style.display = 'none';
                      }
                    }}
                  />
                  
                  {showGuidelines && (
                    <div style={cameraStyles.positionOverlay as React.CSSProperties}>
                      <div style={cameraStyles.silhouette as React.CSSProperties}></div>
                      <div 
                        style={{
                          ...cameraStyles.statusIndicator as React.CSSProperties,
                          ...(isWellPositioned 
                            ? cameraStyles.wellPositioned 
                            : cameraStyles.notPositioned) as React.CSSProperties
                        }}
                      >
                        {isWellPositioned ? 'Well Positioned!' : 'Position your face in the outline'}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={handleCapture}
                      disabled={showGuidelines && !isWellPositioned}
                      className={`flex-1 flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                        showGuidelines && !isWellPositioned
                          ? 'bg-blue-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {captureMode === 'selfie' ? (
                        <>
                          <UserRound className="h-5 w-5 mr-2" />
                          Capture Selfie
                        </>
                      ) : (
                        <>
                          <Camera className="h-5 w-5 mr-2" />
                          Capture Photo
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={toggleGuidelines}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      {showGuidelines ? 'Hide' : 'Show'} Guide
                    </button>
                    
                    <button
                      onClick={toggleCameraFacing}
                      disabled={isSwitchingCamera}
                      className={`px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 ${
                        isSwitchingCamera ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isSwitchingCamera ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <SwitchCamera className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  
                  <p className="mt-2 text-xs text-gray-500 text-center">
                    {captureMode === 'selfie' 
                      ? 'Position yourself so your face is clearly visible'
                      : 'Position the subject to capture a clear photo'}
                  </p>
                  
                  {captureMode === 'selfie' && (
                    <div className="mt-2 bg-blue-50 p-2 rounded text-xs text-blue-700 flex items-center">
                      <Sparkles className="h-4 w-4 mr-1" />
                      We'll remove the background from your selfie
                    </div>
                  )}
                </div>
                
                <PhotoRequirements />
              </>
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
              <>
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
                
                <PhotoRequirements />
              </>
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
                  {error && error.includes('Creating professional') ? 'Processing Image...' :
                    error && error.includes('Removing background') ? 'Removing Background...' : 
                    'Processing...'}
                </>
              ) : (
                <>
                  {captureMode === 'selfie' ? (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Process with Background Removal
                    </>
                  ) : (
                    'Continue with this Photo'
                  )}
                </>
              )}
            </button>
            {isProcessing && (
              <p className="text-xs text-gray-500 text-center mt-2">
                {captureMode === 'selfie' 
                  ? "We'll remove the background from your selfie. This may take a moment."
                  : 'Background removal may take a few moments. Please be patient.'}
              </p>
            )}
          </div>
        )}

        {isGeneratingAIImage && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full text-center">
              <Loader2 className="mx-auto h-12 w-12 text-blue-600 mb-4 animate-spin" />
              <h3 className="text-lg font-semibold mb-2">
                {error && error.includes('Creating professional') ? 
                  'Processing Image' : 
                  'Removing Background'}
              </h3>
              <p className="text-gray-600 mb-4">
                {error && error.includes('Creating professional') ? 
                  "We're finishing up the processing of your image..." : 
                  "We're removing the background from your selfie..."}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full animate-pulse" 
                  style={{ 
                    width: error && error.includes('Creating professional') ? '80%' : '40%',
                    transition: 'width 0.5s ease-in-out'
                  }}
                ></div>
              </div>
              <p className="text-xs text-blue-600 font-medium mb-3">
                {error && error.includes('Creating professional') ? 
                  'Step 2 of 2: Final Processing' : 
                  'Step 1 of 2: Background Removal'}
              </p>
              <p className="text-xs text-gray-500">Please wait while we process your image</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoCapturePage;