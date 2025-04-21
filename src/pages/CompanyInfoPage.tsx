import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Building2, Sparkles, Loader2 } from 'lucide-react';
import { useFormData } from '../context/FormDataContext';

// OpenAI API key
const OPENAI_API_KEY = "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";

// Define the form interface
interface CompanyFormData {
  name: string;
  tagline: string;
  businessType: string;
  address: string;
  phone: string;
  email: string;
}

// Industry-specific keywords for word cloud
const industryKeywords = {
  retail: ['Affordable', 'Quality', 'Selection', 'Premium', 'Trendy', 'Unique', 'Local', 'Exclusive', 'Personalized', 'Satisfaction'],
  service: ['Reliable', 'Professional', 'Expert', 'Trusted', 'Efficient', 'Personal', 'Dedicated', 'Experienced', 'Prompt', 'Guaranteed'],
  restaurant: ['Delicious', 'Fresh', 'Authentic', 'Gourmet', 'Homemade', 'Organic', 'Traditional', 'Innovative', 'Cozy', 'Flavorful'],
  technology: ['Innovative', 'Cutting-edge', 'Smart', 'Revolutionary', 'Advanced', 'Seamless', 'Digital', 'Secure', 'Efficient', 'Future-ready'],
  manufacturing: ['Precision', 'Quality', 'Reliable', 'Durable', 'Engineered', 'Industrial', 'Specialized', 'Certified', 'Custom', 'Innovative'],
  financial: ['Trusted', 'Secure', 'Strategic', 'Growth', 'Investment', 'Prosperity', 'Planning', 'Success', 'Stability', 'Reliable'],
  other: ['Professional', 'Quality', 'Trusted', 'Innovative', 'Reliable', 'Customer-focused', 'Excellence', 'Dedicated', 'Value', 'Growth']
};

const CompanyInfoPage = () => {
  const navigate = useNavigate();
  const { userData, setUserData, isVerified } = useFormData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [availableKeywords, setAvailableKeywords] = useState<string[]>([]);
  const [isGeneratingTagline, setIsGeneratingTagline] = useState(false);
  const [generatedTagline, setGeneratedTagline] = useState('');
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CompanyFormData>({
    defaultValues: {
      name: userData.companyName || '',
      tagline: userData.tagline || '',
      businessType: userData.businessType || '',
      address: userData.address || '',
      phone: userData.phoneNumber || '',
      email: userData.email || ''
    }
  });

  const businessType = watch('businessType');

  // Set keywords based on selected business type
  useEffect(() => {
    if (businessType && industryKeywords[businessType as keyof typeof industryKeywords]) {
      setAvailableKeywords(industryKeywords[businessType as keyof typeof industryKeywords]);
      setSelectedKeywords([]);
    }
  }, [businessType]);

  // Redirect if not verified
  useEffect(() => {
    if (!isVerified && !userData.phoneNumber) {
      navigate('/');
    }
  }, [isVerified, userData.phoneNumber, navigate]);

  // Update form values when userData changes
  useEffect(() => {
    setValue('name', userData.companyName || '');
    setValue('tagline', userData.tagline || '');
    setValue('businessType', userData.businessType || '');
    setValue('address', userData.address || '');
    setValue('phone', userData.phoneNumber || '');
    setValue('email', userData.email || '');
  }, [userData, setValue]);

  // When generated tagline changes, update the form
  useEffect(() => {
    if (generatedTagline) {
      setValue('tagline', generatedTagline);
    }
  }, [generatedTagline, setValue]);

  const toggleKeyword = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      setSelectedKeywords(selectedKeywords.filter(k => k !== keyword));
    } else {
      if (selectedKeywords.length < 3) {
        setSelectedKeywords([...selectedKeywords, keyword]);
      }
    }
  };

  const generateTagline = async () => {
    if (selectedKeywords.length === 0 || !businessType) return;
    
    setIsGeneratingTagline(true);
    setGeneratedTagline(''); // Clear any previous tagline
    
    try {
      const businessName = watch('name') || 'Your Business';
      
      // In a real implementation, this would call the OpenAI API
      // For now, we'll simulate the API call with a timeout
      const prompt = `Generate a catchy, professional tagline for a ${businessType} business named "${businessName}". 
      The tagline should incorporate these key themes: ${selectedKeywords.join(', ')}.
      Make it longer (8-10 words) and memorable.`;
      
      console.log('Generating tagline with prompt:', prompt);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const fakeTaglines = {
        retail: `Discover the finest ${selectedKeywords[0] || 'quality'} products with our ${selectedKeywords[1] || 'personalized'} customer service that ensures complete satisfaction for all your needs.`,
        service: `Experience ${selectedKeywords[0] || 'reliable'}, ${selectedKeywords[1] || 'trusted'} service excellence that exceeds expectations and delivers remarkable results for every customer, every time.`,
        restaurant: `Indulge in our ${selectedKeywords[0] || 'fresh'}, ${selectedKeywords[1] || 'authentic'} culinary creations that transport your taste buds to new and exciting flavor destinations.`,
        technology: `Transforming tomorrow through ${selectedKeywords[0] || 'innovative'} ${selectedKeywords[1] || 'cutting-edge'} solutions that empower businesses and individuals to achieve their fullest potential.`,
        manufacturing: `Crafting ${selectedKeywords[0] || 'precision'} ${selectedKeywords[1] || 'engineered'} products with meticulous attention to detail and unwavering commitment to excellence in every piece.`,
        financial: `Building lasting financial ${selectedKeywords[0] || 'prosperity'} through ${selectedKeywords[1] || 'trusted'} partnerships and strategic planning that secures your future for generations to come.`,
        other: `Committed to delivering ${selectedKeywords[0] || 'excellence'} in ${selectedKeywords[1] || 'everything'} we do, setting new standards in our industry and exceeding your highest expectations.`
      };
      
      // Generate a more personalized tagline based on selected keywords
      const tagline = fakeTaglines[businessType as keyof typeof fakeTaglines] || `Your dedicated partner in delivering ${selectedKeywords.join(', ')} solutions that transform challenges into opportunities for sustainable growth.`;
      console.log('Generated tagline:', tagline);
      
      setGeneratedTagline(tagline);
      
      /* 
      // Actual OpenAI implementation would look something like this:
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-4",
            messages: [
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 100
          })
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('OpenAI response:', data);
        
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
          const tagline = data.choices[0].message.content.trim();
          setGeneratedTagline(tagline);
        } else {
          throw new Error('Invalid response from OpenAI');
        }
      } catch (apiError) {
        console.error('OpenAI API error:', apiError);
        throw apiError;
      }
      */
      
    } catch (error) {
      console.error('Error generating tagline:', error);
      alert('Failed to generate tagline. Please try again or enter one manually.');
    } finally {
      setIsGeneratingTagline(false);
    }
  };

  const onSubmit = async (data: CompanyFormData) => {
    try {
      setIsSubmitting(true);
      
      // Update userData in context
      setUserData({
        ...userData,
        companyName: data.name,
        tagline: data.tagline,
        businessType: data.businessType,
        address: data.address,
        email: data.email
      });
      
      // Navigate to photo capture page
      navigate('/photo');
    } catch (error) {
      console.error('Error:', error);
      alert('There was an error submitting the form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if fields were pre-filled from OTP verification
  const isPrefilledFromVerification = (field: keyof CompanyFormData): boolean => {
    if (!isVerified) return false;
    
    // Check if this field had a value when coming from OTP verification
    const initialValues = {
      name: userData.companyName,
      tagline: userData.tagline,
      businessType: userData.businessType,
      address: userData.address,
      phone: userData.phoneNumber,
      email: userData.email
    };
    
    // Special case for tagline - always allow editing
    if (field === 'tagline') return false;
    
    return !!initialValues[field];
  };

  // Help text to show for read-only fields
  const getReadOnlyHelperText = (field: keyof CompanyFormData) => {
    return isPrefilledFromVerification(field) ? 
      "This field is pre-filled from your verified account and cannot be edited" : "";
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Building2 className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Company Information</h2>
          <p className="mt-2 text-sm text-gray-600">
            Tell us about your business to create personalized posters
          </p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Company Name</label>
              <input
                type="text"
                {...register('name', { required: 'Company name is required' })}
                className={`mt-1 block w-full rounded-md ${isPrefilledFromVerification('name') ? 'bg-gray-100' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                readOnly={isPrefilledFromVerification('name')}
              />
              {errors.name && <span className="text-red-500 text-sm">{errors.name.message}</span>}
              {isPrefilledFromVerification('name') && 
                <p className="mt-1 text-xs text-blue-600">{getReadOnlyHelperText('name')}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Business Type</label>
              <select
                {...register('businessType', { required: 'Business type is required' })}
                className={`mt-1 block w-full rounded-md ${isPrefilledFromVerification('businessType') ? 'bg-gray-100' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                disabled={isPrefilledFromVerification('businessType')}
              >
                <option value="">Select a type</option>
                <option value="retail">Retail</option>
                <option value="service">Service</option>
                <option value="restaurant">Restaurant</option>
                <option value="technology">Technology</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="financial">Financial Services</option>
                <option value="other">Other</option>
              </select>
              {errors.businessType && <span className="text-red-500 text-sm">{errors.businessType.message}</span>}
              {isPrefilledFromVerification('businessType') && 
                <p className="mt-1 text-xs text-blue-600">{getReadOnlyHelperText('businessType')}</p>}
            </div>

            {businessType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select up to 3 keywords that best describe your business
                </label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {availableKeywords.map((keyword) => (
                    <button
                      key={keyword}
                      type="button"
                      onClick={() => toggleKeyword(keyword)}
                      className={`px-3 py-1 rounded-full text-sm font-medium 
                        ${selectedKeywords.includes(keyword) 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }
                        ${selectedKeywords.length >= 3 && !selectedKeywords.includes(keyword) ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                      disabled={selectedKeywords.length >= 3 && !selectedKeywords.includes(keyword)}
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Tagline</label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  {...register('tagline', { required: 'Tagline is required' })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                  placeholder="Your company's slogan or motto"
                  readOnly={true}
                />
                {selectedKeywords.length > 0 && (
                  <div className="mt-2">
                    {isGeneratingTagline ? (
                      <div className="flex items-center bg-blue-50 p-3 rounded-md border border-blue-100 text-blue-700">
                        <Loader2 className="animate-spin h-5 w-5 mr-3" />
                        <div>
                          <p className="font-medium">Generating tagline with AI...</p>
                          <p className="text-xs mt-1">Using keywords: {selectedKeywords.join(', ')}</p>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={generateTagline}
                        disabled={selectedKeywords.length === 0}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
                      >
                        <Sparkles className="-ml-1 mr-2 h-4 w-4" />
                        Generate with AI
                      </button>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Your tagline will be automatically generated based on your selected keywords
                    </p>
                  </div>
                )}
              </div>
              {errors.tagline && <span className="text-red-500 text-sm">{errors.tagline.message}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <textarea
                {...register('address', { required: 'Address is required' })}
                rows={3}
                className={`mt-1 block w-full rounded-md ${isPrefilledFromVerification('address') ? 'bg-gray-100' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                readOnly={isPrefilledFromVerification('address')}
              />
              {errors.address && <span className="text-red-500 text-sm">{errors.address.message}</span>}
              {isPrefilledFromVerification('address') && 
                <p className="mt-1 text-xs text-blue-600">{getReadOnlyHelperText('address')}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Information</label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <input
                    type="tel"
                    {...register('phone', { required: 'Phone is required' })}
                    placeholder="Phone"
                    className={`block w-full rounded-md ${isPrefilledFromVerification('phone') ? 'bg-gray-100' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                    readOnly={isPrefilledFromVerification('phone')}
                  />
                  {errors.phone && <span className="text-red-500 text-sm">{errors.phone.message}</span>}
                  {isPrefilledFromVerification('phone') && 
                    <p className="mt-1 text-xs text-blue-600">{getReadOnlyHelperText('phone')}</p>}
                </div>
                <div>
                  <input
                    type="email"
                    {...register('email', { required: 'Email is required' })}
                    placeholder="Email"
                    className={`block w-full rounded-md ${isPrefilledFromVerification('email') ? 'bg-gray-100' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                    readOnly={isPrefilledFromVerification('email')}
                  />
                  {errors.email && <span className="text-red-500 text-sm">{errors.email.message}</span>}
                  {isPrefilledFromVerification('email') && 
                    <p className="mt-1 text-xs text-blue-600">{getReadOnlyHelperText('email')}</p>}
                </div>
              </div>
            </div>

            <div className="pt-5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
              >
                {isSubmitting ? 'Submitting...' : 'Continue to Add Photo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompanyInfoPage;