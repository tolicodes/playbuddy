import React from 'react';
import { Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendar,
  faGamepad,
  faHandcuffs,
} from '@fortawesome/free-solid-svg-icons';

export const Header = () => {
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
        <Link to="/">
          <Typography
            variant="h6"
            style={{ cursor: 'pointer', marginRight: '1rem', color: 'black', fontWeight: 'bold', textDecoration: 'none' }}
          >
            PlayBuddy
          </Typography>
        </Link>

        <div
          style={{
            display: 'flex',
            gap: '5px',
            flex: 1,
          }}
        >
          <Link to="/">

            <Button
              variant="contained"
            >
              <FontAwesomeIcon
                icon={faCalendar}
                size="2x"
              />
            </Button>
          </Link>

          <Link to="/game">
            <Button
              variant="contained"
            >
              <FontAwesomeIcon
                icon={faGamepad}
                size="2x"
              />
            </Button>
          </Link>

          <Link to="/kinks">
            <Button
              variant="contained"
            >
              <FontAwesomeIcon
                icon={faHandcuffs}
                size="2x"
              />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
