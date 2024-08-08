import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import LoginButton from './LoginButton';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendar, faGamepad } from '@fortawesome/free-solid-svg-icons';

export const Header = () => {
  const navigate = useNavigate(); // Initialize the useNavigate hook

  const handlePlayGameClick = () => {
    navigate('/game'); // Navigate to /game when the button is clicked
  };

  const handeHomeClick = () => {
    navigate('/');
  };

  const handleClickCalendar = () => {
    navigate('/calendar');
  }

  return (
    <Box
      sx={{
        backgroundColor: '#f0f0f0',
        p: .5,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Typography
        variant="h6"
        onClick={handeHomeClick}
      >
        KinkBuddy
      </Typography>

      <div style={{
        display: 'flex', alignItems: 'center'
      }}>
        <Button
          onClick={handleClickCalendar}
        >
          <FontAwesomeIcon icon={faCalendar} size="2x" />
        </Button>
        <Button onClick={handlePlayGameClick} style={{ padding: '0px' }}>
          <FontAwesomeIcon icon={faGamepad} size="2x" />
        </Button>
      </div>
      <LoginButton />
    </Box>
  );
};
