import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { Camera, Upload, RefreshCw, Loader2, AlertCircle, Info, SwitchCamera, Sparkles, User, UserRound } from 'lucide-react';
import { useFormData } from '../context/FormDataContext';
import { removeBackground, generateAIImage } from '../services/api';

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
  const [showGuidelines, setShowGuidelines] = useState<boolean>(true);
  const [isWellPositioned, setIsWellPositioned] = useState<boolean>(false);
  // New state variables for AI image generation
  const [isGeneratingAIImage, setIsGeneratingAIImage] = useState<boolean>(false);
  const [aiGeneratedImage, setAiGeneratedImage] = useState<string | null>(null);
  const [detectedGender, setDetectedGender] = useState<'male' | 'female' | null>(null);
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
          aspectRatio: { ideal: 0.6667 } // 2:3 aspect ratio for portrait
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

      // If this is a selfie (front camera) and we should use AI generation
      if (captureMode === 'selfie') {
        // First detect gender from the selfie
        const gender = await detectGender(image);
        setDetectedGender(gender);
        
        // Generate professional image
        const generatedImage = await generateProfessionalImage(gender);
        
        if (generatedImage) {
          setAiGeneratedImage(generatedImage);
          
          // Generate a blob from the AI image
          const aiImageResponse = await fetch(generatedImage);
          const aiImageBlob = await aiImageResponse.blob();
          
          // Now process the AI-generated image to remove background
          setError('Processing AI-generated image...');
          const bgRemovalResponse = await removeBackground(aiImageBlob);
          
          if (!bgRemovalResponse.success) {
            throw new Error(bgRemovalResponse.error || 'Failed to process AI-generated image');
          }
          
          // Save both original selfie and processed AI image to context
          setProcessedImage({
            original: image, // Original selfie for reference
            processed: bgRemovalResponse.data as string // Processed AI image
          });
        } else {
          throw new Error('Failed to generate professional image');
        }
      } else {
        // Regular photo processing (back camera or uploaded image)
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
      }
      
      // Clear processing message
      setError(null);
      
      // Navigate to the poster generator page
      navigate('/generate');
    } catch (error) {
      console.error('Error processing image:', error);
      setError('There was an error processing your image. Please try again with a clearer photo with a simple background.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to detect gender from a selfie image
  const detectGender = async (imageSrc: string): Promise<'male' | 'female'> => {
    try {
      // In a production app, this would call a proper face detection API
      // For this prototype, we'll use a simulated gender detection
      
      console.log('Detecting gender from selfie...');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For a more realistic prototype, we'd use random detection for testing
      // In a real implementation, use Azure Face API, AWS Rekognition, or similar
      const detectedGender = Math.random() > 0.5 ? 'male' : 'female';
      console.log(`Detected gender: ${detectedGender}`);
      
      /* 
      // Example of how to use an actual API (like Azure Face API):
      const response = await fetch('https://your-face-api-endpoint.com/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': 'your-api-key'
        },
        body: JSON.stringify({
          url: imageSrc
        })
      });
      
      const data = await response.json();
      const detectedGender = data.gender;
      */
      
      return detectedGender;
    } catch (error) {
      console.error('Error detecting gender:', error);
      // Default to male if detection fails
      return 'male';
    }
  };

  // Generate professional image from selfie using OpenAI DALL-E
  const generateProfessionalImage = async (gender: 'male' | 'female'): Promise<string | null> => {
    try {
      setIsGeneratingAIImage(true);
      setError('Generating professional portrait. This may take a moment...');
      
      console.log(`Generating professional ${gender} portrait with AI...`);
      
      // Construct appropriate prompt based on gender
      const prompt = gender === 'male' 
        ? "A professional-looking Indian businessman in formal attire (suit, tie) against a plain background, from chest up, looking confident, for a business poster. Photorealistic style, centered composition, good lighting."
        : "A professional-looking Indian businesswoman in formal attire (blazer) against a plain background, from chest up, looking confident, for a business poster. Photorealistic style, centered composition, good lighting.";
      
      // Call our API service
      const result = await generateAIImage(prompt, gender);
      
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to generate AI image');
      }
    } catch (error) {
      console.error('Error generating professional image:', error);
      return null;
    } finally {
      setIsGeneratingAIImage(false);
      setError(null);
    }
  };

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
              <div style={cameraStyles.container as React.CSSProperties}>
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
                    disabled={!isWellPositioned && showGuidelines}
                    className={`flex-1 flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      !isWellPositioned && showGuidelines
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
                    We'll use AI to convert your selfie into a professional portrait
                  </div>
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
                  {isGeneratingAIImage ? 'Generating AI Portrait...' : 
                    error && error.includes('Processing') ? 'Removing Background...' : 'Processing...'}
                </>
              ) : (
                <>
                  {captureMode === 'selfie' ? (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      {`Continue with ${captureMode === 'selfie' ? 'AI Portrait Generation' : 'this Photo'}`}
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
                  ? 'AI portrait generation and background removal may take a few moments. Please be patient.'
                  : 'Background removal may take a few moments. Please be patient.'}
              </p>
            )}
          </div>
        )}

        {isGeneratingAIImage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full text-center">
              <Sparkles className="mx-auto h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Creating Your Professional Portrait</h3>
              <p className="text-gray-600 mb-4">Our AI is transforming your selfie into a professional business portrait...</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full animate-pulse w-full"></div>
              </div>
              <p className="text-xs text-gray-500 mt-3">This may take up to 30 seconds</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoCapturePage;