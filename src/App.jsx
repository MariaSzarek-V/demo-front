import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LeagueProvider } from './contexts/LeagueContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Games from './components/Games';
import AdminGames from './components/AdminGames';
import Ranking from './components/Ranking';
import Compare from './components/Compare';
import PredictionHistory from './components/PredictionHistory';
import Chat from './components/Chat';
import Posts from './components/Posts';
import GameResults from './components/GameResults';
import PredictionForm from './components/PredictionForm';
import Profile from './components/Profile';
import Footer from './components/Footer';
import './App.css';

console.log('========== APP.JSX LOADED ==========');

function App() {
  console.log('========== APP COMPONENT RENDERING ==========');
  return (
    <Router>
      <AuthProvider>
        <LeagueProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <div id="wrapper">
                    <div id="content-wrapper" className="d-flex flex-column" style={{ marginLeft: 0 }}>
                      <div id="content">
                        <Header />
                        <Routes>
                          <Route path="/" element={<Navigate to="/dashboard" replace />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/games" element={<Games />} />
                          <Route path="/admin/games" element={<AdminGames />} />
                          <Route path="/ranking" element={<Ranking />} />
                          <Route path="/compare/:userId" element={<Compare />} />
                          <Route path="/prediction-history" element={<PredictionHistory />} />
                          <Route path="/chat" element={<Chat />} />
                          <Route path="/posts" element={<Posts />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/results/:gameId" element={<GameResults />} />
                          <Route path="/predictions/new/:gameId" element={<PredictionForm />} />
                          <Route path="/predictions/edit/:predictionId" element={<PredictionForm />} />
                        </Routes>
                      </div>
                      <Footer />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
            </Routes>
          </LeagueProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
