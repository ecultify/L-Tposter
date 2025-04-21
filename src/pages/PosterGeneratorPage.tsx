import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, RefreshCw, Share2, Camera, ArrowLeft, Send, CheckCircle, XCircle } from 'lucide-react';
import type { PosterTemplate } from '../types';
import { useFormData } from '../context/FormDataContext';
import { submitPoster } from '../services/api';

// Main template is the L&T image with Bumrah
const LT_TEMPLATE_IMAGE = '/images/mage.jpg';

const PosterGeneratorPage = () => {
  const navigate = useNavigate();
  const { 
    userData, 
    processedImage, 
    posterImage, 
    setPosterImage,
    clearAllData,
    isVerified 
  } = useFormData();
  
  const [generatedPoster, setGeneratedPoster] = useState<string | null>(posterImage);
  const [isGenerating, setIsGenerating] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Redirect if not verified or no processed image
  useEffect(() => {
    if (!isVerified || !processedImage) {
      navigate('/');
    }
  }, [isVerified, processedImage, navigate]);

  // Update local state when posterImage changes in context
  useEffect(() => {
    if (posterImage) {
      setGeneratedPoster(posterImage);
    }
  }, [posterImage]);

  // Auto-submit when poster is generated
  useEffect(() => {
    if (generatedPoster && submissionStatus === 'idle' && posterImage) {
      handleSubmitPoster();
    }
  }, [generatedPoster, posterImage]);

  const generateCompositeImage = async (processedImageUrl: string) => {
    if (!processedImage) return;
    
    setIsGenerating(true);
    
    try {
      // Create a canvas to combine the frame and user's image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not create canvas context');
      }
      
      // Set canvas size to match template dimensions
      canvas.width = 1040;
      canvas.height = 1200;
      
      // Load the template image (L&T with Bumrah)
      const templateImg = new Image();
      templateImg.crossOrigin = 'anonymous';
      
      // Load the user's processed image
      const userImg = new Image();
      userImg.crossOrigin = 'anonymous';
      
      // Wait for both images to load
      await new Promise<void>((resolve, reject) => {
        templateImg.onload = () => {
          userImg.onload = () => {
            // Draw the template on the canvas
            ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
            
            // Calculate position to place user image to the left of Bumrah
            // Bumrah is on the right side of the image
            const userImgWidth = userImg.width;
            const userImgHeight = userImg.height;
            
            // Scale user image to appropriate height (larger than before, approximately matching Bumrah's height)
            const scale = Math.min(
              (canvas.width * 0.55) / userImgWidth, // Increased from 0.48 to 0.55
              (canvas.height * 0.65) / userImgHeight // Increased from 0.45 to 0.65 to match Bumrah's height
            );
            
            const scaledWidth = userImgWidth * scale;
            const scaledHeight = userImgHeight * scale;
            
            // Position image further to the left to create space between it and Bumrah
            const x = canvas.width * 0.06 - 40; // Move 40px further to the left
            const y = canvas.height - (scaledHeight * 0.80) - 60; // Move 60px upward
            
            // Draw the user image
            ctx.drawImage(userImg, x, y, scaledWidth, scaledHeight);
            
            // Add company info text to the canvas
            // Using specific styling from the reference image
            
            // Use tagline from user data if available, otherwise use the default
            const tagline = userData.tagline || 'Believed in myself, took the right steps, and success followed';
            
            // Split the tagline into multiple lines if needed
            let taglineLines: string[] = [];
            // Increase width of each line to use more horizontal space
            const maxLineLength = 40; // Increased from 25
            
            if (tagline.length > 35) {
              // Break into multiple lines
              const words = tagline.split(' ');
              let currentLine = '';
              
              words.forEach((word) => {
                if ((currentLine + word).length < maxLineLength) {
                  currentLine += (currentLine ? ' ' : '') + word;
                } else {
                  taglineLines.push(currentLine);
                  currentLine = word;
                }
              });
              
              if (currentLine) {
                taglineLines.push(currentLine);
              }
            } else {
              // Short enough for one line
              taglineLines = [tagline];
            }

            // Inspirational message at the top (white, large, bold text)
            ctx.fillStyle = 'white';
            ctx.font = 'bold 48px Arial'; // Slightly larger than 45px
            ctx.textAlign = 'left';
            
            // Calculate proper vertical spacing for taglines
            const taglineStartY = canvas.height * 0.12;
            const taglineLineHeight = 60; // Reduced from 65
            
            taglineLines.forEach((line, index) => {
              ctx.fillText(line, 60, taglineStartY + (index * taglineLineHeight));
            });
            
            // Fixed positioning for company info regardless of tagline length
            // This ensures contact info stays in the proper position
            const circleY = canvas.height * 0.42 - 45; // Moved up by 45px
            
            // Calculate space between tagline and company info
            const taglineEndY = taglineStartY + (taglineLines.length * taglineLineHeight);
            const minSpacing = 50; // Minimum space between tagline and company info
            
            // Only adjust company info position if tagline is too close
            const adjustedCircleY = Math.max(circleY, taglineEndY + minSpacing);
            
            // Draw user icon circles (yellow background)
            ctx.beginPath();
            ctx.arc(80, adjustedCircleY, 30, 0, 2 * Math.PI);
            ctx.fillStyle = '#FFC72C'; // L&T Finance gold/yellow color
            ctx.fill();
            
            // Draw phone icon circle
            ctx.beginPath();
            ctx.arc(80, adjustedCircleY + 85, 30, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw person icon in the first circle (simplified)
            ctx.fillStyle = 'black';
            ctx.font = 'bold 24px Arial';
            ctx.fillText('👤', 68, adjustedCircleY + 8);
            
            // Draw phone icon in the second circle (simplified)
            ctx.fillText('📞', 68, adjustedCircleY + 93);
            
            // Draw user info text
            ctx.fillStyle = 'white';
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(userData.companyName || 'Mr. Ravi Kumar', 130, adjustedCircleY - 15);
            ctx.font = '22px Arial';
            ctx.fillText(userData.businessType || 'Precision Manufacturing Co.', 130, adjustedCircleY + 15);
            
            // Phone number
            ctx.font = 'bold 28px Arial';
            ctx.fillText(userData.phoneNumber || '8765343009', 130, adjustedCircleY + 95);
            
            // Convert the composite image to data URL
            const compositeImageUrl = canvas.toDataURL('image/png');
            setGeneratedPoster(compositeImageUrl);
            setPosterImage(compositeImageUrl);
            resolve();
          };
          userImg.onerror = reject;
          userImg.src = processedImageUrl;
        };
        templateImg.onerror = reject;
        templateImg.src = LT_TEMPLATE_IMAGE;
      });
    } catch (err) {
      console.error('Error generating composite image:', err);
      setError('Failed to generate poster. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!processedImage) {
      setError('No photo available. Please add a photo first.');
      return;
    }
    
    try {
      await generateCompositeImage(processedImage.processed);
    } catch (err) {
      console.error('Error in handleGenerate:', err);
      setError('Failed to generate poster. Please try again.');
    }
  };

  const handleDownload = () => {
    if (!generatedPoster) return;
    
    // Create a download link
    const link = document.createElement('a');
    link.href = generatedPoster;
    link.download = `business-poster-${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmitPoster = async () => {
    if (!generatedPoster || !userData.phoneNumber) return;
    
    setSubmissionStatus('loading');
    setError(null);
    
    try {
      // Convert base64/data URL to blob
      const response = await fetch(generatedPoster);
      const blob = await response.blob();
      
      // Submit poster to L&T API
      const submitResponse = await submitPoster(blob, {
        phoneNumber: userData.phoneNumber,
        companyName: userData.companyName,
        email: userData.email
      });
      
      if (!submitResponse.success) {
        throw new Error(submitResponse.error || 'Failed to submit poster to L&T');
      }
      
      setSubmissionStatus('success');
      setError('Poster successfully submitted to L&T Finance!');
      
      // Clear the error message after 5 seconds
      setTimeout(() => {
        if (setError) setError(null);
      }, 5000);
    } catch (err) {
      console.error('Error submitting poster:', err);
      setSubmissionStatus('error');
      setError('Failed to submit poster to L&T. You can still download it.');
    }
  };

  const goBackToPhotoPage = () => {
    navigate('/photo');
  };

  const handleShare = async () => {
    if (!generatedPoster) return;
    
    try {
      // Check if Web Share API is available
      const hasWebShare = 'share' in navigator;
      
      // Create a share dialog with all options immediately
      const shareDialog = document.createElement('div');
      shareDialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      shareDialog.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
          <h3 class="text-lg font-semibold mb-4">Share Poster</h3>
          <p class="mb-4">Choose how you'd like to share:</p>
          <div class="space-y-3">
            ${hasWebShare ? `
              <button id="web-share" class="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700">
                Share via Device
              </button>
            ` : ''}
            <button id="copy-link" class="w-full py-2 px-4 ${hasWebShare ? 'border border-gray-300 text-gray-700' : 'bg-blue-600 text-white'} rounded hover:${hasWebShare ? 'bg-gray-50' : 'bg-blue-700'}">
              Copy to Clipboard
            </button>
            <button id="download-image" class="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
              Download Image
            </button>
            <button id="close-dialog" class="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      `;
      
      document.body.appendChild(shareDialog);
      
      // Add event listeners for share options
      if (hasWebShare) {
        document.getElementById('web-share')?.addEventListener('click', async () => {
          try {
            // Try sharing with files first
            try {
              const response = await fetch(generatedPoster);
              const blob = await response.blob();
              const file = new File([blob], 'business-poster.png', { type: 'image/png' });
              
              await navigator.share({
                title: 'My Business Poster',
                text: 'Check out my business poster!',
                files: [file]
              });
              
              document.body.removeChild(shareDialog);
              setError('Poster shared successfully!');
              setTimeout(() => setError(null), 3000);
            } catch (fileShareError) {
              // Fall back to text-only sharing
              console.log('File sharing not supported, falling back to text sharing');
              
              await navigator.share({
                title: 'My Business Poster',
                text: 'Check out my business poster!'
              });
              
              document.body.removeChild(shareDialog);
              setError('Poster shared successfully!');
              setTimeout(() => setError(null), 3000);
            }
          } catch (err) {
            console.error('Sharing failed:', err);
            document.body.removeChild(shareDialog);
            setError('Sharing failed. Please try another option.');
            setTimeout(() => setError(null), 3000);
          }
        });
      }
      
      document.getElementById('copy-link')?.addEventListener('click', async () => {
        try {
          // Try using the modern Clipboard API first
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText('Check out my business poster!');
          } else {
            // Fallback to the old execCommand method
            const textArea = document.createElement('textarea');
            textArea.value = 'Check out my business poster!';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
          }
          
          document.body.removeChild(shareDialog);
          setError('Message copied to clipboard!');
          setTimeout(() => setError(null), 3000);
        } catch (clipboardErr) {
          console.error('Clipboard error:', clipboardErr);
          document.body.removeChild(shareDialog);
          setError('Failed to copy to clipboard. Please try downloading instead.');
          setTimeout(() => setError(null), 3000);
        }
      });
      
      document.getElementById('download-image')?.addEventListener('click', () => {
        handleDownload();
        document.body.removeChild(shareDialog);
        setError('Poster downloaded successfully!');
        setTimeout(() => setError(null), 3000);
      });
      
      document.getElementById('close-dialog')?.addEventListener('click', () => {
        document.body.removeChild(shareDialog);
      });
      
    } catch (err) {
      console.error('Error sharing poster:', err);
      setError('Failed to share poster. Try downloading it instead.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const resetFlow = () => {
    clearAllData();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={goBackToPhotoPage}
            className="inline-flex items-center text-sm text-gray-700 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Photo
          </button>
          
          <button
            onClick={resetFlow}
            className="inline-flex items-center text-sm text-gray-700 hover:text-red-600"
          >
            Start Over
          </button>
        </div>

        {error && (
          <div className={`border px-4 py-3 rounded mb-6 ${
            error.includes('success') 
              ? 'bg-green-50 border-green-200 text-green-700' 
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {error}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Column - Controls */}
          <div className="w-full md:w-1/3 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">L&T Business Loan</h2>
              <p className="text-gray-600">Create your personalized business poster with L&T Finance. Upload your photo to appear alongside the brand ambassador.</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Your Photo</h2>
              {processedImage ? (
                <div className="bg-gray-100 rounded-lg overflow-hidden mb-4">
                  <img 
                    src={processedImage.processed} 
                    alt="Your Processed Photo" 
                    className="w-full object-contain"
                    style={{ maxHeight: '200px' }}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 bg-gray-100 rounded-lg mb-4">
                  <Camera className="h-10 w-10 text-gray-400" />
                </div>
              )}
                  <button
                onClick={goBackToPhotoPage}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Change Photo
                  </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !processedImage}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="animate-spin h-5 w-5 mr-2" />
                      Generating...
                    </>
                  ) : (
                    'Generate Poster'
                  )}
                </button>

                <button
                  onClick={handleDownload}
                  disabled={!generatedPoster}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Download
                </button>

                <button
                  onClick={handleShare}
                  disabled={!generatedPoster}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Share2 className="h-5 w-5 mr-2" />
                  Share
                </button>

                <button
                  onClick={handleSubmitPoster}
                  disabled={!generatedPoster || submissionStatus === 'loading' || submissionStatus === 'success'}
                  className={`w-full flex items-center justify-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${
                    submissionStatus === 'success'
                      ? 'bg-green-600 text-white border-transparent'
                      : submissionStatus === 'error'
                      ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                      : submissionStatus === 'loading'
                      ? 'bg-gray-200 text-gray-500 border-gray-300'
                      : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {submissionStatus === 'success' ? (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Submitted to L&T
                    </>
                  ) : submissionStatus === 'error' ? (
                    <>
                      <XCircle className="h-5 w-5 mr-2" />
                      Retry Submission
                    </>
                  ) : submissionStatus === 'loading' ? (
                    <>
                      <RefreshCw className="animate-spin h-5 w-5 mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Submit to L&T
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="w-full md:w-2/3">
            <div className="bg-white p-6 rounded-lg shadow h-full">
              <h2 className="text-xl font-semibold mb-4">Preview</h2>
              <div className="aspect-[9/16] bg-gray-100 rounded-lg overflow-hidden" style={{aspectRatio: '1040/1200'}}>
                {generatedPoster ? (
                  <img
                    src={generatedPoster}
                    alt="Generated Poster"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    {processedImage ? 'Click "Generate Poster" to preview' : 'No photo available'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PosterGeneratorPage;