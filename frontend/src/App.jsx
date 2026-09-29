import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import ResidentForm from './components/ResidentForm';
import ResidentStatus from './components/ResidentStatus';
import CommitteeDashboard from './components/CommitteeDashboard';
import Login from './components/Login';
import { Home, LayoutDashboard, LogOut } from 'lucide-react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(localStorage.getItem('isAuthenticated') === 'true');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-background text-text-main">
        <header className="bg-surface/80 backdrop-blur-md border-b border-border sticky top-0 z-[60]">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link to="/" className="text-xl font-bold text-primary-600 flex items-center gap-2">
              <Home className="w-5 h-5" />
              SocietyDesk
            </Link>
            <nav className="flex items-center gap-4 text-sm font-semibold">
              <Link to="/" className="text-text-muted hover:text-primary-600 transition-colors">Resident</Link>
              <Link to="/dashboard" className="flex items-center gap-1 text-text-muted hover:text-primary-600 transition-colors">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              {isAuthenticated && (
                <button onClick={handleLogout} className="flex items-center gap-1 text-critical-text hover:text-critical-text/80 transition-colors ml-2 bg-critical-bg px-3 py-1.5 rounded-lg border border-critical-border">
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </nav>
          </div>
        </header>

        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<ResidentForm />} />
            <Route path="/status/:id" element={<ResidentStatus />} />
            <Route path="/login" element={<Login onLogin={setIsAuthenticated} />} />
            <Route 
              path="/dashboard" 
              element={isAuthenticated ? <CommitteeDashboard /> : <Navigate to="/login" />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
