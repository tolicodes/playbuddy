import React from 'react';
import { Grid, Button, Box } from '@mui/material';
import { LEVELS, Level } from '../KinkLibrary/types';

interface LevelButtonsProps {
  selectedLevel?: Level;
  onClickLevel: (level: Level) => void;
}

const LevelButtons: React.FC<LevelButtonsProps> = ({
  selectedLevel,
  onClickLevel,
}) => {
  return (
    <Box sx={{ p: 1 }}>
      <Grid
        container
        spacing={2}
      >
        {LEVELS.map((level, index) => {
          const isSelected = selectedLevel === level.label;
          // Common styles for hover and isSelected
          const selectedAndHoverStyles = {
            backgroundColor: level.color,
            color: '#FFFFFF',
            borderColor: level.color,
            fontWeight: 'bold',
          };

          // unselected styles
          const unselectedStyles = {
            backgroundColor: '#fff',
            color: level.color,
            borderColor: level.color,
            fontWeight: 'normal',
          };

          const hoverStyles = {
            '&:hover': selectedAndHoverStyles,
          };

          const currentStyles = isSelected
            ? selectedAndHoverStyles
            : unselectedStyles;

          // Button styles
          const buttonSx = {
            ...currentStyles,
            ...hoverStyles,
          };

          return (
            <Grid
              item
              xs={6}
              sm={3}
              key={index}
            >
              <Button
                fullWidth
                variant={'outlined'}
                sx={buttonSx}
                onClick={() => {
                  onClickLevel(level.label);
                }}
              >
                {level.label}
              </Button>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default LevelButtons;
