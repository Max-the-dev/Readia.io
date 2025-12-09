import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import ScrollToTop from './components/ScrollToTop';
import ShillQuestApp from './apps/shill-quest/ShillQuestApp';
import ShillQuestProviders from './apps/shill-quest/providers/ShillQuestProviders';
import './App.css';

const MainAppProviders = lazy(() => import('./providers/MainAppProviders'));
const MainLayout = lazy(() => import('./MainLayout'));

// ShillQuest is only accessible in development/staging, not on production readia.io
const isProductionReadia =
  import.meta.env.PROD && window.location.hostname === 'readia.io';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* ShillQuest route - hidden in production */}
          {!isProductionReadia ? (
            <Route
              path="/shill/*"
              element={
                <ShillQuestProviders>
                  <ShillQuestApp />
                </ShillQuestProviders>
              }
            />
          ) : (
            <Route path="/shill/*" element={<Navigate to="/" replace />} />
          )}
          <Route
            path="/*"
            element={
              <Suspense fallback={null}>
                <MainAppProviders>
                  <div className="App">
                    <MainLayout />
                  </div>
                </MainAppProviders>
              </Suspense>
            }
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
