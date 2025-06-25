import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { QueryClientProvider } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/react-query';
import { EventDetails } from './components/EventList/EventDetails';
import './index.css';
import WebEntryModal from './components/WebEntryModal/WebEntryModal';

const queryClient = new QueryClient();

const App = () => {
  const [showModal, setShowModal] = useState(true);

  return (
    <React.StrictMode>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          {showModal ? (
            <WebEntryModal onClose={() => setShowModal(false)} />
          ) : (
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/event/:eventId" element={<EventDetails />} />
            </Routes>
          )}
        </QueryClientProvider>
      </BrowserRouter>
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);
