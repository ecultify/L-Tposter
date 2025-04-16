import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, RefreshCw, Share2, Camera, ArrowLeft } from 'lucide-react';
import type { PosterTemplate } from '../types';

// Define the poster templates
const templates: PosterTemplate[] = [
  { id: '1', name: 'Modern Business', dimensions: { width: 1080, height: 1920 } },
  { id: '2', name: 'Professional Corporate', dimensions: { width: 1080, height: 1920 } },
  { id: '3', name: 'Creative Agency', dimensions: { width: 1080, height: 1920 } },
];

// Frame image URLs for each template
const templateFrames = {
  '1': 'https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=1080&h=1920',
  '2': 'https://images.unsplash.com/photo-1557683311-eac922347aa1?auto=format&fit=crop&w=1080&h=1920',
  '3': 'https://images.unsplash.com/photo-1557682257-2f9c37a3a5f3?auto=format&fit=crop&w=1080&h=1920',
};

const PosterGeneratorPage = () => {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<string>(templates[0].id);
  const [generatedPoster, setGeneratedPoster] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userImage, setUserImage] = useState<{ original: string; processed: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load user image on component mount
  useEffect(() => {
    const storedImages = sessionStorage.getItem('userImages');
    
    if (storedImages) {
      try {
        const parsedImages = JSON.parse(storedImages);
        setUserImage(parsedImages);
      } catch (err) {
        console.error('Error parsing stored images:', err);
        setError('Could not load your photo. Please try again.');
      }
    } else {
      // If no images found, redirect back to photo page
      setError('No photo found. Please add a photo first.');
    }
  }, []);

  const generateCompositeImage = async (templateId: string, processedImageUrl: string) => {
    setIsGenerating(true);
    
    try {
      // Create a canvas to combine the frame and user's image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not create canvas context');
      }
      
      // Set canvas size to match template dimensions
      canvas.width = 1080;
      canvas.height = 1920;
      
      // Load the frame image
      const frameImg = new Image();
      frameImg.crossOrigin = 'anonymous';
      
      // Load the user's processed image
      const userImg = new Image();
      userImg.crossOrigin = 'anonymous';
      
      // Wait for both images to load
      await new Promise<void>((resolve, reject) => {
        frameImg.onload = () => {
          userImg.onload = () => {
            // Draw the frame on the canvas
            ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
            
            // Calculate position to center the user image in the bottom half
            const userImgWidth = userImg.width;
            const userImgHeight = userImg.height;
            const scale = Math.min(
              (canvas.width * 0.8) / userImgWidth,
              (canvas.height * 0.5) / userImgHeight
            );
            
            const scaledWidth = userImgWidth * scale;
            const scaledHeight = userImgHeight * scale;
            const x = (canvas.width - scaledWidth) / 2;
            const y = canvas.height - scaledHeight - (canvas.height * 0.2); // Position in bottom area
            
            // Draw the user image on top of the frame
            ctx.drawImage(userImg, x, y, scaledWidth, scaledHeight);
            
            // Convert the composite image to data URL
            const compositeImageUrl = canvas.toDataURL('image/png');
            setGeneratedPoster(compositeImageUrl);
            resolve();
          };
          userImg.onerror = reject;
          userImg.src = processedImageUrl;
        };
        frameImg.onerror = reject;
        frameImg.src = templateFrames[templateId as keyof typeof templateFrames];
      });
    } catch (err) {
      console.error('Error generating composite image:', err);
      setError('Failed to generate poster. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!userImage) {
      setError('No photo available. Please add a photo first.');
      return;
    }
    
    try {
      await generateCompositeImage(selectedTemplate, userImage.processed);
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={goBackToPhotoPage}
            className="inline-flex items-center text-sm text-gray-700 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Photo
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Column - Controls */}
          <div className="w-full md:w-1/3 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Choose Template</h2>
              <div className="space-y-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`w-full p-3 rounded-lg text-left ${
                      selectedTemplate === template.id
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'border-2 border-gray-200 hover:border-blue-200'
                    }`}
                  >
                    <h3 className="font-medium">{template.name}</h3>
                    <p className="text-sm text-gray-500">
                      {template.dimensions.width} x {template.dimensions.height}px
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Your Photo</h2>
              {userImage ? (
                <div className="bg-gray-100 rounded-lg overflow-hidden mb-4">
                  <img 
                    src={userImage.processed} 
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
                  disabled={isGenerating || !userImage}
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
              </div>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="w-full md:w-2/3">
            <div className="bg-white p-6 rounded-lg shadow h-full">
              <h2 className="text-xl font-semibold mb-4">Preview</h2>
              <div className="aspect-[9/16] bg-gray-100 rounded-lg overflow-hidden">
                {generatedPoster ? (
                  <img
                    src={generatedPoster}
                    alt="Generated Poster"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    {userImage ? 'Click "Generate Poster" to preview' : 'No photo available'}
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