// Polyfill Buffer for browser (required by x402-solana package)
import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App';


const queryClient = new QueryClient()

const rootElement = document.getElementById('root')!;
createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
