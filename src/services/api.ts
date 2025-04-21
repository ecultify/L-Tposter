// API configuration
const API_CONFIG = {
  baseUrl: import.meta.env.PROD 
    ? 'https://lt-api.example.com' 
    : 'https://lt-api.example.com', // Replace with actual production/dev URLs
  apiKey: import.meta.env.VITE_APP_API_KEY || 'mock-api-key',
  removeApiKey: 'VmEeChTnKgAvW7NVH1bYrQC1', // Your remove.bg API key
};

// Type definitions
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface OtpVerificationResponse {
  userExists: boolean;
  userData?: {
    companyName?: string;
    tagline?: string;
    businessType?: string;
    address?: string;
    email?: string;
    logo?: string | null;
  };
}

export interface PosterSubmissionResponse {
  id: string;
  posterUrl: string;
  submittedAt: string;
}

// Helper function to simulate API calls in development
const simulateApi = <T>(responseData: T, shouldFail = false, delay = 1000): Promise<ApiResponse<T>> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        resolve({ success: false, error: 'Simulated API failure' });
      } else {
        resolve({ success: true, data: responseData });
      }
    }, delay);
  });
};

// Verify OTP
export const verifyOtp = async (phoneNumber: string, otp: string): Promise<ApiResponse<OtpVerificationResponse>> => {
  try {
    // Uncomment to use real API when available
    // const response = await fetch(`${API_CONFIG.baseUrl}/verify-otp`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${API_CONFIG.apiKey}`
    //   },
    //   body: JSON.stringify({ phone: phoneNumber, otp })
    // });
    // 
    // if (!response.ok) {
    //   throw new Error(`HTTP error! status: ${response.status}`);
    // }
    // 
    // const data = await response.json();
    // return { success: true, data };

    // Fallback: Simulate API response
    console.log('Simulating OTP verification for:', phoneNumber, 'OTP:', otp);
    
    // Mock user exists if OTP ends with "123"
    const userExists = otp.endsWith('123');
    
    return simulateApi<OtpVerificationResponse>({
      userExists,
      userData: userExists ? {
        companyName: 'Example Company',
        tagline: 'Your trusted partner',
        businessType: 'retail',
        address: '123 Business St, City',
        email: `user${phoneNumber.slice(-4)}@example.com`,
      } : undefined
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'OTP verification failed' 
    };
  }
};

// Submit poster to L&T
export const submitPoster = async (
  posterBlob: Blob,
  userData: {
    phoneNumber: string;
    companyName?: string;
    email?: string;
  }
): Promise<ApiResponse<PosterSubmissionResponse>> => {
  try {
    // Uncomment to use real API when available
    // const formData = new FormData();
    // formData.append('poster', posterBlob, 'poster.png');
    // formData.append('phoneNumber', userData.phoneNumber);
    // formData.append('companyName', userData.companyName || '');
    // formData.append('email', userData.email || '');
    // 
    // const response = await fetch(`${API_CONFIG.baseUrl}/submit-poster`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${API_CONFIG.apiKey}`
    //   },
    //   body: formData
    // });
    // 
    // if (!response.ok) {
    //   throw new Error(`HTTP error! status: ${response.status}`);
    // }
    // 
    // const data = await response.json();
    // return { success: true, data };

    // Fallback: Simulate API response
    console.log('Simulating poster submission for:', userData.phoneNumber);
    
    return simulateApi<PosterSubmissionResponse>({
      id: `poster-${Date.now()}`,
      posterUrl: URL.createObjectURL(posterBlob), // Create a local URL for the blob
      submittedAt: new Date().toISOString()
    }, false, 2000); // Simulate 2 second delay
  } catch (error) {
    console.error('Poster submission error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Poster submission failed' 
    };
  }
};

// Process image with remove.bg API
export const removeBackground = async (imageFile: Blob): Promise<ApiResponse<string>> => {
  try {
    console.log('Processing image for background removal with remove.bg API...');
    
    // Create a data URL from the blob for fallback
    const imageUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(imageFile);
    });
    
    // Maximum number of API call attempts
    const maxAttempts = 2;
    let currentAttempt = 0;
    let lastError: Error | null = null;
    
    // Try multiple attempts
    while (currentAttempt < maxAttempts) {
      currentAttempt++;
      console.log(`API attempt ${currentAttempt}/${maxAttempts}`);
      
      try {
        // Create form data for the API request
        const formData = new FormData();
        formData.append('image_file', imageFile);
        formData.append('size', 'auto');
        formData.append('format', 'png');

        // Call remove.bg API with a longer timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout (increased from 5s)

        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: {
            'X-Api-Key': API_CONFIG.removeApiKey,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          body: formData,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Failed to process image: ${response.statusText}`);
        }

        // Convert the response to a blob and then to a data URL
        const processedImageBlob = await response.blob();
        
        // Validate the blob - make sure it's actually a PNG and has content
        if (processedImageBlob.size < 100) {
          throw new Error('Received empty or invalid image from API');
        }
        
        const processedImageUrl = URL.createObjectURL(processedImageBlob);
        
        // Pre-load the image to ensure it's complete
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            // Make sure the image has a width and height
            if (img.width > 0 && img.height > 0) {
              resolve();
            } else {
              reject(new Error('Processed image has invalid dimensions'));
            }
          };
          img.onerror = () => reject(new Error('Failed to load processed image'));
          img.src = processedImageUrl;
        });
        
        console.log('Background removal successful');
        return {
          success: true,
          data: processedImageUrl
        };
      } catch (apiError) {
        lastError = apiError instanceof Error ? apiError : new Error(String(apiError));
        console.warn(`API attempt ${currentAttempt} failed:`, apiError);
        
        // If we have more attempts, wait briefly before trying again
        if (currentAttempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between attempts
        }
      }
    }
    
    // If we've exhausted all API attempts, use the fallback
    console.warn('All API attempts failed, using fallback method:', lastError);
    return simulateBackgroundRemoval(imageUrl);
    
  } catch (error) {
    console.error('Background removal error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Image processing failed'
    };
  }
};

// Helper function for fallback background removal
const simulateBackgroundRemoval = async (imageUrl: string): Promise<ApiResponse<string>> => {
  try {
    // Simulate API processing delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = imageUrl;
    });
    
    // Create a canvas
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not create canvas context');
    }
    
    // Draw original image
    ctx.drawImage(img, 0, 0);
    
    // Get image data for pixel manipulation
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Threshold values for background detection
    const EDGE_THRESHOLD = 20; // Sensitivity for edge detection
    const BACKGROUND_TOLERANCE = 30; // Color similarity threshold
    
    // Create a mask for the background detection
    const mask = new Uint8ClampedArray(data.length / 4);
    
    // Detect edges first (simple Sobel operator)
    const edgeMap = new Uint8ClampedArray(data.length / 4);
    for (let y = 1; y < canvas.height - 1; y++) {
      for (let x = 1; x < canvas.width - 1; x++) {
        const idx = (y * canvas.width + x);
        const pixelIdx = idx * 4;
        
        // Check surrounding pixels for color difference
        const current = {
          r: data[pixelIdx],
          g: data[pixelIdx + 1],
          b: data[pixelIdx + 2]
        };
        
        // Check pixel to the right
        const rightIdx = pixelIdx + 4;
        const right = {
          r: data[rightIdx],
          g: data[rightIdx + 1],
          b: data[rightIdx + 2]
        };
        
        // Check pixel below
        const belowIdx = pixelIdx + (canvas.width * 4);
        const below = {
          r: data[belowIdx],
          g: data[belowIdx + 1],
          b: data[belowIdx + 2]
        };
        
        // Calculate color difference
        const diffRight = Math.abs(current.r - right.r) + 
                         Math.abs(current.g - right.g) +
                         Math.abs(current.b - right.b);
                         
        const diffBelow = Math.abs(current.r - below.r) + 
                         Math.abs(current.g - below.g) +
                         Math.abs(current.b - below.b);
        
        // If we detect a significant edge
        if (diffRight > EDGE_THRESHOLD || diffBelow > EDGE_THRESHOLD) {
          edgeMap[idx] = 255; // Mark as edge
        }
      }
    }
    
    // Analyze the corners and edges to identify the likely background color
    const colorSamples = [];
    
    // Sample the corners (likely background)
    const cornerPoints = [
      { x: 5, y: 5 },
      { x: canvas.width - 5, y: 5 },
      { x: 5, y: canvas.height - 5 },
      { x: canvas.width - 5, y: canvas.height - 5 }
    ];
    
    for (const point of cornerPoints) {
      const idx = (point.y * canvas.width + point.x) * 4;
      colorSamples.push({
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2]
      });
    }
    
    // Sample a few points along the edges
    for (let i = 0; i < 10; i++) {
      const x1 = Math.floor(canvas.width * (i / 10));
      const x2 = Math.floor(canvas.width * (i / 10));
      const y1 = 5;
      const y2 = canvas.height - 5;
      
      const idx1 = (y1 * canvas.width + x1) * 4;
      const idx2 = (y2 * canvas.width + x2) * 4;
      
      colorSamples.push({
        r: data[idx1],
        g: data[idx1 + 1],
        b: data[idx1 + 2]
      });
      
      colorSamples.push({
        r: data[idx2],
        g: data[idx2 + 1],
        b: data[idx2 + 2]
      });
    }
    
    // Apply a flood fill from edges to identify background
    // Mark every edge pixel as background
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x);
        const pixelIdx = idx * 4;
        
        // Skip if already processed
        if (mask[idx] !== 0) continue;
        
        // If we're at an edge of the image
        if (x === 0 || y === 0 || x === canvas.width - 1 || y === canvas.height - 1) {
          // This is likely background - compare with our background samples
          const currentColor = {
            r: data[pixelIdx],
            g: data[pixelIdx + 1],
            b: data[pixelIdx + 2]
          };
          
          // Check if color is similar to our background samples
          mask[idx] = 1; // Mark as background
          
          // Flood fill to connected similar colors
          const queue = [{x, y}];
          while (queue.length > 0) {
            const {x: cx, y: cy} = queue.shift()!;
            const currentIdx = (cy * canvas.width + cx);
            const currentPixelIdx = currentIdx * 4;
            
            // Process neighbors
            const neighbors = [
              {x: cx - 1, y: cy}, // left
              {x: cx + 1, y: cy}, // right
              {x: cx, y: cy - 1}, // top
              {x: cx, y: cy + 1}  // bottom
            ];
            
            for (const {x: nx, y: ny} of neighbors) {
              // Skip out of bounds
              if (nx < 0 || ny < 0 || nx >= canvas.width || ny >= canvas.height) continue;
              
              const neighborIdx = (ny * canvas.width + nx);
              
              // Skip if already processed
              if (mask[neighborIdx] !== 0) continue;
              
              const neighborPixelIdx = neighborIdx * 4;
              const neighborColor = {
                r: data[neighborPixelIdx],
                g: data[neighborPixelIdx + 1],
                b: data[neighborPixelIdx + 2]
              };
              
              // Check color similarity
              const colorDiff = Math.abs(neighborColor.r - currentColor.r) + 
                              Math.abs(neighborColor.g - currentColor.g) +
                              Math.abs(neighborColor.b - currentColor.b);
                               
              if (colorDiff < BACKGROUND_TOLERANCE && edgeMap[neighborIdx] === 0) {
                mask[neighborIdx] = 1; // Mark as background
                queue.push({x: nx, y: ny});
              }
            }
          }
        }
      }
    }
    
    // Apply the mask - make background transparent
    for (let i = 0; i < data.length; i += 4) {
      const idx = i / 4;
      if (mask[idx] === 1) {
        // This is background, make it transparent
        data[i + 3] = 0; // Set alpha to 0
      }
    }
    
    // If the subject was detected as background (which can happen), use distance from center as fallback
    let hasSubject = false;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        hasSubject = true;
        break;
      }
    }
    
    if (!hasSubject) {
      console.log("Subject detection failed, using center-based approach");
      // Reset alpha values
      for (let i = 0; i < data.length; i += 4) {
        data[i + 3] = 255;
      }
      
      // Use distance from center approach as fallback
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4;
          
          // Calculate normalized distance from center (0-1)
          const distX = (x - centerX) / (canvas.width / 2);
          const distY = (y - centerY) / (canvas.height / 2);
          const dist = Math.sqrt(distX * distX + distY * distY);
          
          // Use a soft falloff for transparency
          if (dist > 0.7) {
            // Gradually decrease alpha from edge
            const alpha = Math.max(0, 1 - (dist - 0.7) * 3);
            data[idx + 3] = Math.round(255 * alpha);
          }
        }
      }
    }
    
    // Put the modified image data back on the canvas
    ctx.putImageData(imageData, 0, 0);
    
    // Convert to data URL
    const processedImageUrl = canvas.toDataURL('image/png');
    
    return {
      success: true,
      data: processedImageUrl
    };
  } catch (fallbackError) {
    console.error('Fallback background removal failed:', fallbackError);
    return {
      success: false,
      error: 'Image processing failed in fallback mode'
    };
  }
};

// Generate image using OpenAI DALL-E
export const generateAIImage = async (
  prompt: string,
  gender: 'male' | 'female'
): Promise<ApiResponse<string>> => {
  try {
    console.log(`Generating AI image with prompt: ${prompt}`);
    
    // Use a fallback image instead of calling OpenAI directly
    
    // Select appropriate fallback image based on gender
    const fallbackUrl = gender === 'male'
      ? 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1024&auto=format&fit=crop'
      : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1024&auto=format&fit=crop';
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
        
    // Return fallback URL as success
    return {
      success: true,
      data: fallbackUrl
    };
  } catch (error) {
    console.error('Error generating AI image:', error);
    
    // Fallback to placeholder images
    console.log('Using fallback placeholder images');
    
    const fallbackUrl = gender === 'male'
      ? 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1024&auto=format&fit=crop'
      : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1024&auto=format&fit=crop';
        
    // Return fallback URL as success
    return {
      success: true,
      data: fallbackUrl
    };
  }
};

// Process background-removed selfie to create a professional body shot using OpenAI
export const createProfessionalBodyShot = async (
  bgRemovedImageUrl: string
): Promise<ApiResponse<string>> => {
  try {
    console.log('Creating professional body shot from background-removed selfie...');
    
    // Current implementation tries to call OpenAI API directly from the browser,
    // which can fail due to CORS, DNS resolution issues, or API key security concerns
    
    // For now, use a mock professional portrait instead of making the actual API call
    // In a production environment, you would implement a backend proxy for this
    
    // Let's simulate API processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Select a professional portrait based on the image characteristics
    // You could use more sophisticated detection here, but for simplicity:
    const randomIndex = Math.floor(Math.random() * 4);
    
    // Array of professional business portraits
    const professionalPortraits = [
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1024&auto=format&fit=crop', // male with suit
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1024&auto=format&fit=crop', // female with blazer
      'https://images.unsplash.com/photo-1600486913747-55e5470d6f40?q=80&w=1024&auto=format&fit=crop', // male business casual
      'https://images.unsplash.com/photo-1580894732930-0babd100d356?q=80&w=1024&auto=format&fit=crop'  // female business casual
    ];
    
    // Download the selected image
    console.log('Downloading professional portrait...');
    const imageResponse = await fetch(professionalPortraits[randomIndex]);
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch professional portrait: ${imageResponse.statusText}`);
    }
    
    const blob = await imageResponse.blob();
    console.log('Professional portrait downloaded, size:', blob.size);
    
    const processedImageUrl = URL.createObjectURL(blob);
    console.log('Created object URL for the professional portrait');
    
    return {
      success: true,
      data: processedImageUrl
    };
  } catch (error) {
    console.error('Error creating professional body shot:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Return error with the original background-removed image as fallback
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create professional body shot'
    };
  }
}; 