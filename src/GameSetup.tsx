import React, { useState } from 'react';
import { FormControl, InputLabel, Select, MenuItem, FormGroup, FormControlLabel, Checkbox, Button, Typography, SelectChangeEvent } from '@mui/material';

const GameSetup: React.FC = () => {
    const [difficulty, setDifficulty] = useState('');
    const [isAtHome, setIsAtHome] = useState(false);
    const [needsSupplies, setNeedsSupplies] = useState(false);
  
    // Handler for difficulty change
    const handleDifficultyChange = (event: SelectChangeEvent<string>) => {
      setDifficulty(event.target.value as string);
    };
  
    // Handler for toggle options
    const handleToggleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      switch (event.target.name) {
        case 'isAtHome':
          setIsAtHome(event.target.checked);
          break;
        case 'needsSupplies':
          setNeedsSupplies(event.target.checked);
          break;
        default:
          break;
      }
    };
  
    // Submit Handler
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      // Further processing or state management logic here
    };
  
    return (
      <form onSubmit={handleSubmit}>
        <Typography variant="h6" gutterBottom>Game Setup</Typography>
        <FormControl fullWidth margin="normal">
          <InputLabel id="difficulty-select-label">Difficulty</InputLabel>
          <Select
            labelId="difficulty-select-label"
            id="difficulty-select"
            value={difficulty}
            label="Difficulty"
            onChange={handleDifficultyChange}
          >
            <MenuItem value="easy">Easy</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="hard">Hard</MenuItem>
          </Select>
        </FormControl>
        <FormGroup>
          <FormControlLabel control={<Checkbox checked={isAtHome} onChange={handleToggleChange} name="isAtHome" />} label="At Home" />
          <FormControlLabel control={<Checkbox checked={needsSupplies} onChange={handleToggleChange} name="needsSupplies" />} label="Needs Supplies" />
        </FormGroup>
        <Button type="submit" variant="contained" color="primary">Generate Ideas</Button>
      </form>
    );
  };
  
  export default GameSetup;
  