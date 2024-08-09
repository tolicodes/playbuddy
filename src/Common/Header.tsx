import { Typography, Button } from '@mui/material';
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
    <div
      style={{
        backgroundColor: '#f0f0f0',
        // p: .5,
        display: 'flex',
        // justifyContent: 'space-between',
        alignItems: ' center',
        padding: '.5rem 1rem'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center'
      }}>
        <Typography
          variant="h6"
          onClick={handeHomeClick}
          style={{ cursor: 'pointer', marginRight: '1rem' }}
        >
          KinkBuddy
        </Typography>

        <div style={{
          display: 'flex',
          gap: '5px '
          // alignItems: 'center'
        }}>
          <Button
            onClick={handleClickCalendar}
            variant='contained'
            style={{ marginRight: '1rem' }}
          >
            <FontAwesomeIcon icon={faCalendar} size="2x" />
          </Button>
          <Button onClick={handlePlayGameClick} variant='contained'>
            <FontAwesomeIcon icon={faGamepad} size="2x" />
          </Button>
        </div>
      </div>
      <LoginButton />
    </div >
  );
};
