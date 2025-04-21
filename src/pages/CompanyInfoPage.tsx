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
      Make it concise (maximum 8 words) and memorable.`;
      
      console.log('Generating tagline with prompt:', prompt);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const fakeTaglines = {
        retail: `${selectedKeywords[0] || 'Quality'} retail experience with ${selectedKeywords[1] || 'personalized'} service`,
        service: `${selectedKeywords[0] || 'Reliable'} service, ${selectedKeywords[1] || 'trusted'} results`,
        restaurant: `${selectedKeywords[0] || 'Fresh'}, ${selectedKeywords[1] || 'authentic'} flavors await`,
        technology: `${selectedKeywords[0] || 'Innovative'} solutions for ${selectedKeywords[1] || 'tomorrow'}'s challenges`,
        manufacturing: `${selectedKeywords[0] || 'Precision'} ${selectedKeywords[1] || 'engineering'}, reliable results`,
        financial: `Building ${selectedKeywords[0] || 'prosperity'} through ${selectedKeywords[1] || 'trusted'} partnerships`,
        other: `${selectedKeywords[0] || 'Excellence'} in ${selectedKeywords[1] || 'everything'} we do`
      };
      
      // Generate a more personalized tagline based on selected keywords
      const tagline = fakeTaglines[businessType as keyof typeof fakeTaglines] || `Your ${selectedKeywords.join(' and ')} partner`;
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
            max_tokens: 50
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.name && <span className="text-red-500 text-sm">{errors.name.message}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Business Type</label>
              <select
                {...register('businessType', { required: 'Business type is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Your company's slogan or motto"
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
                    {!isGeneratingTagline && (
                      <p className="mt-1 text-xs text-gray-500">
                        Generate a tagline using AI based on your selected keywords
                      </p>
                    )}
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.address && <span className="text-red-500 text-sm">{errors.address.message}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Information</label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <input
                    type="tel"
                    {...register('phone', { required: 'Phone is required' })}
                    placeholder="Phone"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  {errors.phone && <span className="text-red-500 text-sm">{errors.phone.message}</span>}
                </div>
                <div>
                  <input
                    type="email"
                    {...register('email', { required: 'Email is required' })}
                    placeholder="Email"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  {errors.email && <span className="text-red-500 text-sm">{errors.email.message}</span>}
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