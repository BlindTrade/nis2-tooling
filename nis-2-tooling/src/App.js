// Landing page
import LandingPage from './components/landingpage/LandingPage';
// Main page
import AssetPage from './components/mainpage/AssetPage';
// Report page
import OverviewPage from './components/overview/Overview'

import { BrowserRouter as Router, Route, Switch, Routes, BrowserRouter } from 'react-router-dom';
import './style/App.css';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/assets" element={<AssetPage />} />
        <Route path="/assets/:projectId" element={<AssetPage />} />
        <Route path="/overview/:projectId" element={<OverviewPage />} />
      </Routes>
    </Router>
  );
};

export default App;
