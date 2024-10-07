import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import CssBaseline from '@mui/material/CssBaseline';

import GameSetup from './Game/Game';
import KinkLibrary from './KinkLibrary/KinkLibrary';
import KinkAdminTable from './Admin/KinkAdminTable';
import FavoriteKinks from './User/FavoriteKinks/FavoriteKinks';
import QueryProvider from './Common/QueryProvider';
import { EventCalendar } from './EventCalendar/EventCalendar';
import { Header } from './Common/Header';
import AppDownloadModal from './Common/AppDownloadModal';

import * as amplitude from '@amplitude/analytics-browser';
import { Support } from './Common/Support';

amplitude.init('a68ac6bb7695dd7d955ddb8a0928eeed');


function App() {
  return (
    <>
      <QueryProvider>
        <CssBaseline /> {/* This is for baseline styles */}
        <ThemeProvider theme={theme}>
          <Router>
            <div
              style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Header />

              <AppDownloadModal />

              <Routes>
                <Route
                  path="support"
                  element={<Support />}
                />
                <Route
                  path="game"
                  element={<GameSetup />}
                />
                <Route
                  path="/kinks"
                  element={<KinkLibrary />}
                />
                <Route
                  path="/favorite"
                  element={<FavoriteKinks />}
                />
                <Route
                  path="/admin"
                  element={<KinkAdminTable />}
                />
                <Route
                  path="/"
                  element={<EventCalendar />}
                />
                <Route
                  path="/calendar"
                  element={<EventCalendar />}
                />
                <Route
                  path="/calendar/whatsapp"
                  element={<EventCalendar type="Whatsapp" />}
                />
              </Routes>
            </div>
          </Router>
        </ThemeProvider>
      </QueryProvider>
    </>
  );
}

export default App;
