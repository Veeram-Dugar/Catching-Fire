import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Nav from './components/Nav.jsx';
import Home from './pages/Home.jsx';
import ReportMap from './pages/ReportMap.jsx';
import GamePage from './pages/GamePage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Nav />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<ReportMap />} />
          <Route path="/game" element={<GamePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
