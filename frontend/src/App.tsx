import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { WalletProvider } from './contexts/WalletContext';
import { AuthProvider } from './contexts/AuthContext';
import { AuthToastProvider } from './contexts/AuthToastContext';
import { useWalletConnectionManager } from './hooks/useWalletConnectionManager';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import SessionExpiredModal from './components/SessionExpiredModal';
import AuthPromptToast from './components/AuthPromptToast';
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
import NotFound from './pages/NotFound';
import './App.css'

const DEFAULT_TITLE = 'Readia.io - Micropayment Content Platform';
const ROUTE_TITLES: Record<string, string> = {
  '/': 'Readia.io - Micropayment Content Platform',
  '/write': 'Readia - Write an Article',
  '/dashboard': 'Readia Dashboard',
  '/whitepaper': 'Readia Whitepaper',
  '/about': 'About Readia',
  '/how-it-works': 'How Readia Works',
  '/pricing': 'Readia Pricing',
  '/resources': 'Readia Resources',
  '/help': 'Readia Help Center',
  '/privacy': 'Readia Privacy Policy',
  '/terms': 'Readia Terms of Service',
  '/contact': 'Contact Readia',
  '/x402-test': 'Readia x402 Test',
  '/explore': 'Explore Readia',
};

function usePageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    let title = ROUTE_TITLES[pathname];

    if (!title) {
      if (pathname.startsWith('/article/')) {
        title = 'Readia Article';
      } else if (pathname.startsWith('/edit/')) {
        title = 'Readia Editor';
      } else {
        title = DEFAULT_TITLE;
      }
    }

    document.title = title;
  }, [pathname]);
}

// Inner component that uses the wallet connection manager
function AppContent() {
  // This hook prevents auto-reconnect when user has explicitly disconnected
  useWalletConnectionManager();
  usePageTitle();

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
          <Route path="*" element={<NotFound />} />
       </Routes>
      </main>
      <Footer />
      <SessionExpiredModal />
      <AuthPromptToast />
    </>
  );
}

function App() {
  return (
    <WalletProvider>
      <AuthProvider>
        <AuthToastProvider>
          <Router>
            <ScrollToTop />
            <div className="App">
              <AppContent />
            </div>
          </Router>
        </AuthToastProvider>
      </AuthProvider>
    </WalletProvider>
  );
}

export default App
