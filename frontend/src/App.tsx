import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './contexts/WalletContext';
import { useWalletConnectionManager } from './hooks/useWalletConnectionManager';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Write from './pages/Write';
import Dashboard from './pages/Dashboard';
import Article from './pages/Article';
import EditArticle from './pages/EditArticle';
import About from './pages/About';
import HowItWorks from './pages/HowItWorks';
import Pricing from './pages/Pricing';
import Resources from './pages/Resources';
import Help from './pages/Help';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Contact from './pages/Contact';
import X402Test from './pages/X402Test';
import Explore from './pages/Explore';
import Whitepaper from './pages/Whitepaper';
import './App.css'

// Inner component that uses the wallet connection manager
function AppContent() {
  // This hook prevents auto-reconnect when user has explicitly disconnected
  useWalletConnectionManager();

  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/write" element={<Write />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/edit/:id" element={<EditArticle />} />
          <Route path="/article/:id" element={<Article />} />
          <Route path="/whitepaper" element={<Whitepaper />} />
          <Route path="/about" element={<About />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/help" element={<Help />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/x402-test" element={<X402Test />} />
          <Route path="/explore" element={<Explore />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

function App() {
  return (
    <WalletProvider>
      <Router>
        <ScrollToTop />
        <div className="App">
          <AppContent />
        </div>
      </Router>
    </WalletProvider>
  );
}

export default App
