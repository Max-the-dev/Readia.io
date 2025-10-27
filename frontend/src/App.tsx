import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './contexts/WalletContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Write from './pages/Write';
import Dashboard from './pages/Dashboard';
import Article from './pages/Article';
import './App.css'

function App() {
  return (
    <WalletProvider>
      <Router>
        <div className="App">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/write" element={<Write />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/article/:id" element={<Article />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </WalletProvider>
  );
}

export default App
