import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowRight, Layout, Image, Share2 } from 'lucide-react';
import { useFormData } from '../context/FormDataContext';

const LandingPage = () => {
  const navigate = useNavigate();
  const { userData, setUserData, clearAllData } = useFormData();
  const [phoneNumber, setPhoneNumber] = useState('');

  // Clear any existing data when landing page loads - only runs once
  useEffect(() => {
    clearAllData();
  }, []); // Empty dependency array ensures it only runs once on mount

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber) {
      setUserData({ ...userData, phoneNumber });
      navigate('/verify');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-1/2 text-white">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                L&T Finance - Digital Poster Generator
              </h1>
              <p className="text-xl mb-8 text-blue-100">
                Create personalized business posters with L&T Finance - Your trusted financial partner
              </p>
              <form onSubmit={handleSubmit} className="flex items-center space-x-4 bg-white rounded-lg p-2 w-full md:w-96">
                <Phone className="text-blue-600" />
                <input
                  type="tel"
                  placeholder="Enter your mobile number"
                  className="flex-1 border-none focus:ring-0 text-gray-800"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  required
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
                >
                  Start <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </form>
            </div>
            <div className="md:w-1/2 mt-8 md:mt-0">
              <img
                src="https://images.unsplash.com/photo-1542744094-24638eff58bb?auto=format&fit=crop&w=800"
                alt="Business Poster Example"
                className="rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Layout />}
              title="Choose Template"
              description="Select from our professionally designed templates"
            />
            <FeatureCard
              icon={<Image />}
              title="Add Your Content"
              description="Customize with your business details and branding"
            />
            <FeatureCard
              icon={<Share2 />}
              title="Share & Download"
              description="Get your poster ready for print or digital use"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-bold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-blue-400">Terms of Service</a></li>
                <li><a href="#" className="hover:text-blue-400">Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Contact</h3>
              <ul className="space-y-2">
                <li>support@ltfinance.com</li>
                <li>1-800-LT-FINANCE</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Follow Us</h3>
              <div className="flex space-x-4">
                <a href="#" className="hover:text-blue-400">Twitter</a>
                <a href="#" className="hover:text-blue-400">LinkedIn</a>
                <a href="#" className="hover:text-blue-400">Instagram</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="text-center p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
    <div className="inline-block p-3 bg-blue-100 rounded-full text-blue-600 mb-4">
      {icon}
    </div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

export default LandingPage;