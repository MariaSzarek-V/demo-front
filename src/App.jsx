import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Games from './components/Games';
import Ranking from './components/Ranking';
import Comments from './components/Comments';
import GameResults from './components/GameResults';
import PredictionForm from './components/PredictionForm';
import Footer from './components/Footer';
import './App.css';

function App() {
  return (
    <Router>
      <div id="wrapper">
        <div id="content-wrapper" className="d-flex flex-column" style={{ marginLeft: 0 }}>
          <div id="content">
            <Header />
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/games" element={<Games />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/comments" element={<Comments />} />
              <Route path="/results/:gameId" element={<GameResults />} />
              <Route path="/predictions/new/:gameId" element={<PredictionForm />} />
              <Route path="/predictions/edit/:predictionId" element={<PredictionForm />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </div>
    </Router>
  );
}

export default App;
