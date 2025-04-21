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
    
    try {
      // First try the remove.bg API
      // Create form data for the API request
      const formData = new FormData();
      formData.append('image_file', imageFile);
      formData.append('size', 'auto');
      formData.append('format', 'png');

      // Call remove.bg API with a timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': API_CONFIG.removeApiKey,
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
      const processedImageUrl = URL.createObjectURL(processedImageBlob);
      
      return {
        success: true,
        data: processedImageUrl
      };
    } catch (apiError) {
      console.warn('API call failed, using fallback method:', apiError);
      
      // Use the fallback method if the API call fails
      return simulateBackgroundRemoval(imageUrl);
    }
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
    
    // Create a simple background removal effect
    // This is a simplified version that creates a clean oval cutout
    ctx.globalCompositeOperation = 'destination-in';
    
    // Create an elliptical path for the subject
    ctx.beginPath();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radiusX = canvas.width * 0.45; // 45% of width
    const radiusY = canvas.height * 0.85; // 85% of height
    
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fill();
    
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