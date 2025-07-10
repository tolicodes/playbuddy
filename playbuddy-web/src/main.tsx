import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { QueryClientProvider } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/react-query';
import { EventDetails } from './components/EventList/EventDetails';
import './index.css';
import PrivacyPolicy from './pages/PrivacyPolicy/PrivacyPolicy';

const queryClient = new QueryClient();



const App = () => {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/event/:eventId" element={<EventDetails />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Routes>
        </QueryClientProvider>
      </BrowserRouter>
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
