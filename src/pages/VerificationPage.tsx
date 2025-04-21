import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CheckCircle } from 'lucide-react';
import { useFormData } from '../context/FormDataContext';
import { verifyOtp } from '../services/api';

const VerificationPage = () => {
  const navigate = useNavigate();
  const { userData, setUserData, setIsVerified } = useFormData();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Redirect if no phone number is set
  useEffect(() => {
    if (!userData.phoneNumber) {
      navigate('/');
    }
  }, [userData.phoneNumber, navigate]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  const handleVerify = async () => {
    setVerificationStatus('loading');
    setErrorMessage(null);
    
    try {
      const otpCode = otp.join('');
      
      // Call verification API
      const response = await verifyOtp(userData.phoneNumber, otpCode);
      
      if (!response.success) {
        throw new Error(response.error || 'Verification failed');
      }
      
      setVerificationStatus('success');
      setIsVerified(true);
      
      if (response.data?.userExists && response.data.userData) {
        // Prefill user data from API response
        setUserData({
          ...userData,
          companyName: response.data.userData.companyName,
          tagline: response.data.userData.tagline,
          businessType: response.data.userData.businessType,
          address: response.data.userData.address,
          email: response.data.userData.email,
          logo_url: response.data.userData.logo,
        });
      }
      
      // Navigate after a short delay to show success state
      setTimeout(() => {
        navigate('/company-info');
      }, 1000);
    } catch (error) {
      console.error('Error:', error);
      setVerificationStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Verification failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-blue-600">
            <Shield />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Verify Your Number</h2>
          <p className="mt-2 text-sm text-gray-600">
            We've sent a 6-digit code to {userData.phoneNumber}
          </p>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errorMessage}
          </div>
        )}

        <div className="mt-8 space-y-6">
          <div className="flex justify-center space-x-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                className="w-12 h-12 text-center text-2xl border-2 rounded-lg focus:border-blue-500 focus:ring-blue-500"
              />
            ))}
          </div>

          <div>
            <button
              onClick={handleVerify}
              disabled={verificationStatus === 'loading' || verificationStatus === 'success' || otp.some(digit => !digit)}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                verificationStatus === 'success'
                  ? 'bg-green-600'
                  : verificationStatus === 'loading'
                  ? 'bg-gray-400'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {verificationStatus === 'success' ? (
                <span className="flex items-center">
                  Verified <CheckCircle className="ml-2 h-5 w-5" />
                </span>
              ) : verificationStatus === 'loading' ? (
                'Verifying...'
              ) : (
                'Verify OTP'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">For demo purposes:</p>
            <p className="text-sm text-blue-600 font-semibold">Enter "123123" to simulate an existing user</p>
            <p className="text-sm text-blue-600 font-semibold mt-1">Or any other 6 digits for a new user</p>
          </div>

          <div className="text-center">
            <button className="text-sm text-blue-600 hover:text-blue-500">
              Didn't receive the code? Resend
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerificationPage;