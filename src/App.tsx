import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import CssBaseline from '@mui/material/CssBaseline';

import GameSetup from './Game/Game';
import KinkLibrary from './KinkLibrary/KinkLibrary';
import KinkAdminTable from './Admin/KinkAdminTable';
import FavoriteKinks from './User/FavoriteKinks';

function App() {
  return (
    <>
      <CssBaseline /> {/* This is for baseline styles */}
      <ThemeProvider theme={theme}>
        <Router>
          <Routes>
            <Route
              path="game"
              element={<GameSetup />}
            />
            <Route
              path="/"
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
          </Routes>
        </Router>
      </ThemeProvider>
    </>
  );
}

export default App;
