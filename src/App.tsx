import React from 'react';
import Container from '@mui/material/Container';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import CssBaseline from '@mui/material/CssBaseline';

// import GameSetup from './Game/GameSetup';
import KinkLibrary from './KinkLibrary/KinkLibrary';
import { Typography } from '@mui/material';

function App() {
  return (
    <>
      <CssBaseline /> {/* This is for baseline styles */}
      <ThemeProvider theme={theme}>
        {/* <GameSetup /> */}
        <Container>
          <Typography variant="h3">KinkBuddy</Typography>
          <KinkLibrary />
        </Container>
      </ThemeProvider>
    </>
  );
}

export default App;
