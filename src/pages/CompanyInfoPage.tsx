import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Building2, Upload } from 'lucide-react';
import { saveCompany, saveUser } from '../lib/db';
import type { Company } from '../types';

const CompanyInfoPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNewUser = searchParams.get('new') === 'true';
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<Company>();

  const onSubmit = async (data: Company) => {
    try {
      setIsSubmitting(true);
      let logoUrl = null;

      if (previewImage) {
        // Store image data URL directly
        logoUrl = previewImage;
      }

      // Save company data
      const company = {
        name: data.name,
        tagline: data.tagline,
        businessType: data.businessType,
        address: data.address,
        phone: data.phone,
        email: data.email,
        logo_url: logoUrl
      };
      
      const companyId = await saveCompany(company);
      if (typeof companyId !== 'number') {
        throw new Error(companyId.message || 'Failed to save company');
      }
      
      // Update user with company reference
      const userResult = await saveUser({
        phone: data.phone,
        email: data.email,
        name: data.name,
        company_id: companyId
      });

      if ('message' in userResult) {
        throw new Error(userResult.message || 'Failed to save user');
      }

      // Store company ID in session storage for later use
      sessionStorage.setItem('companyId', companyId.toString());
      
      // Navigate to photo capture page
      navigate('/photo');
    } catch (error) {
      console.error('Error:', error);
      alert('There was an error submitting the form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
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
              <label className="block text-sm font-medium text-gray-700">Tagline</label>
              <input
                type="text"
                {...register('tagline', { required: 'Tagline is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Your company's slogan or motto"
              />
              {errors.tagline && <span className="text-red-500 text-sm">{errors.tagline.message}</span>}
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
                <option value="other">Other</option>
              </select>
              {errors.businessType && <span className="text-red-500 text-sm">{errors.businessType.message}</span>}
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

            <div>
              <label className="block text-sm font-medium text-gray-700">Company Logo</label>
              <div className="mt-1 flex items-center">
                <div className="flex-shrink-0">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="h-32 w-32 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="h-32 w-32 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Upload className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <label className="ml-5 cursor-pointer">
                  <span className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    Upload Logo
                  </span>
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </label>
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