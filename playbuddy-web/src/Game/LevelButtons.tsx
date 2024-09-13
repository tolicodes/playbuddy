import React from 'react';
import { Button, Grid, Box } from '@mui/material';
import { styled } from '@mui/system';
import { LEVELS, Level } from '../Common/types';
import * as amplitude from '@amplitude/analytics-browser';

// Styled container for the LevelButtons component
export const StyledBox = styled(Box)({
  padding: 8,
});

// Styled grid container
export const StyledGridContainer = styled(Grid)({
  container: 'true',
  spacing: 2,
});

// Styled grid item
export const StyledGridItem = styled(Grid)({
  item: true,
  xs: 6,
  sm: 3,
});

// Dynamic styles for buttons
export const getButtonStyles = (isSelected: boolean, levelColor: string) => {
  const selectedAndHoverStyles = {
    backgroundColor: levelColor,
    color: '#FFFFFF',
    borderColor: levelColor,
    fontWeight: 'bold',
  };

  const unselectedStyles = {
    backgroundColor: '#fff',
    color: levelColor,
    borderColor: levelColor,
    fontWeight: 'normal',
  };

  const hoverStyles = {
    '&:hover': selectedAndHoverStyles,
  };

  const currentStyles = isSelected
    ? selectedAndHoverStyles
    : unselectedStyles;

  return {
    ...currentStyles,
    ...hoverStyles,
  };
};

interface LevelButtonsProps {
  selectedLevel?: Level;
  onClickLevel: (level: Level) => void;
}

const LevelButtons: React.FC<LevelButtonsProps> = ({
  selectedLevel,
  onClickLevel,
}) => {
  return (
    <StyledBox>
      <StyledGridContainer>
        {LEVELS.map((level, index) => {
          const isSelected = selectedLevel === level.label;
          const buttonSx = getButtonStyles(isSelected, level.color);

          return (
            <StyledGridItem key={index}>
              <Button
                fullWidth
                variant="outlined"
                sx={buttonSx}
                onClick={() => {
                  amplitude.logEvent('level_selected', { level: level.label });
                  onClickLevel(level.label);
                }}
              >
                {level.label}
              </Button>
            </StyledGridItem>
          );
        })}
      </StyledGridContainer>
    </StyledBox>
  );
};

export default LevelButtons;
