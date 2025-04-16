import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CheckCircle } from 'lucide-react';
import { getUser } from '../lib/db';

const VerificationPage = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

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
    
    try {
      const phone = otp.join('');
      const userData = await getUser(phone);
      
      if (userData) {
        setVerificationStatus('success');
        // User exists with company
        navigate('/company-info');
      } else {
        setVerificationStatus('success');
        // User exists but no company
        navigate('/company-info?new=true');
      }
    } catch (error) {
      console.error('Error:', error);
      setVerificationStatus('error');
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
            We've sent a 6-digit code to your mobile number
          </p>
        </div>

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
              disabled={verificationStatus === 'loading' || verificationStatus === 'success'}
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