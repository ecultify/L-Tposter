import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import VerificationPage from './pages/VerificationPage';
import CompanyInfoPage from './pages/CompanyInfoPage';
import PhotoCapturePage from './pages/PhotoCapturePage';
import PosterGeneratorPage from './pages/PosterGeneratorPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/verify" element={<VerificationPage />} />
          <Route path="/company-info" element={<CompanyInfoPage />} />
          <Route path="/photo" element={<PhotoCapturePage />} />
          <Route path="/generate" element={<PosterGeneratorPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
