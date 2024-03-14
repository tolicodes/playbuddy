import React from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import GameSetup from './GameSetup';
import KinkLibrary from './KinkLibrary/KinkLibrary';

function App() {
  return (
    <Container>
      <Typography variant="h4">Welcome to KinkBuddy!</Typography>
      <KinkLibrary />
      {/* <GameSetup /> */}
    </Container>
  );
}

export default App;
