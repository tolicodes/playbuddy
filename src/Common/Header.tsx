import { Typography, Button } from '@mui/material';
import { useNavigation } from '@react-navigation/native';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { NavStack } from '../../kink-buddy-ios/types';
import {
  faCalendar,
  faGamepad,
  faHandcuffs,
} from '@fortawesome/free-solid-svg-icons';

export const Header = () => {
  const navigate = useNavigation<NavStack>();

  const handlePlayGameClick = () => {
    navigate('/game'); // Navigate to /game when the button is clicked
  };

  const handeHomeClick = () => {
    navigate('/');
  };

  const handleClickCalendar = () => {
    navigate('/calendar');
  };

  const handleKinksClick = () => {
    navigate('/kinks');
  };

  return (
    <div
      style={{
        backgroundColor: '#f0f0f0',
        // p: .5,
        display: 'flex',
        // justifyContent: 'space-between',
        alignItems: ' center',
        padding: '.5rem 1rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flex: 1,
        }}
      >
        <Typography
          variant="h6"
          onClick={handeHomeClick}
          style={{ cursor: 'pointer', marginRight: '1rem' }}
        >
          KinkBuddy
        </Typography>

        <div
          style={{
            display: 'flex',
            gap: '5px',
            flex: 1,
            // alignItems: 'center'
          }}
        >
          <Button
            onClick={handleClickCalendar}
            variant="contained"
          >
            <FontAwesomeIcon
              icon={faCalendar}
              size="2x"
            />
          </Button>
          <Button
            onClick={handlePlayGameClick}
            variant="contained"
          >
            <FontAwesomeIcon
              icon={faGamepad}
              size="2x"
            />
          </Button>
          <Button
            onClick={handleKinksClick}
            variant="contained"
          >
            <FontAwesomeIcon
              icon={faHandcuffs}
              size="2x"
            />
          </Button>
        </div>
      </div>
    </div>
  );
};
