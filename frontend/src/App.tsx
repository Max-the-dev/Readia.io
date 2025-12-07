import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import ScrollToTop from './components/ScrollToTop';
import ShillQuestApp from './apps/shill-quest/ShillQuestApp';
import ShillQuestProviders from './apps/shill-quest/providers/ShillQuestProviders';
import './App.css';

const MainAppProviders = lazy(() => import('./providers/MainAppProviders'));
const MainLayout = lazy(() => import('./MainLayout'));

function App() {
  return (
    <ThemeProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route
            path="/shill/*"
            element={
              <ShillQuestProviders>
                <ShillQuestApp />
              </ShillQuestProviders>
            }
          />
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
