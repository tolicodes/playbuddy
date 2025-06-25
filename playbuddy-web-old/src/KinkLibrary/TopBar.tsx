import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, InputBase, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import * as amplitude from '@amplitude/analytics-browser';

export const NavBar: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    amplitude.logEvent('search_term_change', {
      searchTerm: event.target.value,
    });
    setSearchTerm(event.target.value);
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography
          variant="h6"
          component="div"
          sx={{ flexGrow: 1 }}
        >
          Kinks
        </Typography>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <SearchIcon />
          <InputBase
            placeholder="Search…"
            inputProps={{ 'aria-label': 'search' }}
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <Button color="inherit">Search</Button>
        </div>
      </Toolbar>
    </AppBar>
  );
};
