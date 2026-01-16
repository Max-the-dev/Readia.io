import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import SessionExpiredModal from './components/SessionExpiredModal';
import AuthPromptToast from './components/AuthPromptToast';
import Home from './pages/Home';
import Write from './pages/Write';
import Dashboard from './pages/Dashboard';
import Article from './pages/Article';
import EditArticle from './pages/EditArticle';
import Mission from './pages/Mission';
import HowItWorks from './pages/HowItWorks';
import Pricing from './pages/Pricing';
import Resources from './pages/Resources';
import Help from './pages/Help';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Contact from './pages/Contact';
import X402Test from './pages/X402Test';
import Ecosystem from './pages/Ecosystem';
import Explore from './pages/Explore';
import Whitepaper from './pages/Whitepaper';
import Agents from './pages/Agents';
import NotFound from './pages/NotFound';
import { useWalletConnectionManager } from './hooks/useWalletConnectionManager';

const DEFAULT_TITLE = 'Logos by Readia - Micropayment Content Platform';
const ROUTE_TITLES: Record<string, string> = {
  '/': 'Logos by Readia - Micropayment Content Platform',
  '/write': 'Logos - Write an Article',
  '/dashboard': 'Logos Dashboard',
  '/whitepaper': 'Logos Whitepaper',
  '/about': 'About Logos',
  '/mission': 'Logos Mission',
  '/how-it-works': 'How Logos Works',
  '/pricing': 'Logos Pricing',
  '/resources': 'Logos Resources',
  '/help': 'Logos Help Center',
  '/privacy': 'Logos Privacy Policy',
  '/terms': 'Logos Terms of Service',
  '/contact': 'Contact Logos',
  '/x402-test': 'Logos x402 Test',
  '/explore': 'Explore Logos',
  '/agents': 'Logos for Agents',
};

function usePageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    let title = ROUTE_TITLES[pathname];

    if (!title) {
      if (pathname.startsWith('/article/')) {
        title = 'Logos Article';
      } else if (pathname.startsWith('/edit/')) {
        title = 'Logos Editor';
      } else {
        title = DEFAULT_TITLE;
      }
    }

    document.title = title;
  }, [pathname]);
}

function MainLayout() {
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
          <Route path="/article/:id/:slug?" element={<Article />} />
          <Route path="/whitepaper" element={<Whitepaper />} />
          <Route path="/about" element={<Ecosystem />} />
          <Route path="/mission" element={<Mission />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/help" element={<Help />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/x402-test" element={<X402Test />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <SessionExpiredModal />
      <AuthPromptToast />
    </>
  );
}

export default MainLayout;
