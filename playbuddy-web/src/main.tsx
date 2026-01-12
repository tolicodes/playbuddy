import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EventDetails } from './components/EventList/EventDetails';
import './index.css';
import PrivacyPolicy from './pages/PrivacyPolicy/PrivacyPolicy';
import { setupAxiosOfflineCache } from './offline/axiosOfflineCache';

const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: CACHE_MAX_AGE_MS,
    },
  },
});

setupAxiosOfflineCache({ queryClient, maxAgeMs: CACHE_MAX_AGE_MS });

window.addEventListener('online', () => {
  queryClient.refetchQueries({ type: 'all' });
});

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/events" element={<Home />} />
      <Route path="/event/:eventId" element={<EventDetails />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
    </Routes>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
