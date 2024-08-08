import { Box, Typography, Button } from '@mui/material';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'; // Import the game icon
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import LoginButton from './LoginButton';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt } from '@fortawesome/free-solid-svg-icons';

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
          <FontAwesomeIcon icon={faCalendarAlt} size="2x" style={{ width: '30px' }} />
        </Button>
        <div onClick={handlePlayGameClick} style={{ padding: '0px' }}>
          <SportsEsportsIcon style={{ width: '30px' }} />
        </div>
      </div>
      <LoginButton />
    </Box>
  );
};
