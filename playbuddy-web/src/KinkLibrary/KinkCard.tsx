import React from 'react';

import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GroupIcon from '@mui/icons-material/Group';
import { Kink, LEVEL_MAP } from '../Common/types'; // Make sure the import path matches your file structure

export const KinkCard = ({
  kink,
  isFavoriteKink,
  onAddFavorite,
  onRemoveFavorite,
}: {
  kink: Kink;
  isFavoriteKink: boolean;
  onAddFavorite: (id: string) => void;
  onRemoveFavorite: (id: string) => void;
}) => {
  return (
    <Card>
      <CardContent>
        {/* First row with title to the left and icons to the right */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between', // Spread content between left and right
            alignItems: 'center',
            margin: '5px 0',
          }}
        >
          {/* Left-aligned title */}
          <Typography
            variant="h5"
            component="h2"
          >
            {kink.idea_title}
          </Typography>

          {/* Right-aligned icons for Done and Recommended */}
          {/* full width for the icons */}
          <Box sx={{ display: 'flex' }}>
            {kink.status === 'done' && (
              <CheckCircleIcon
                sx={{ color: 'green', fontSize: '25px', marginLeft: '8px' }}
              />
            )}
            {kink.recommended && (
              <StarIcon
                sx={{ color: 'orange', fontSize: '25px', marginLeft: '8px' }}
              />
            )}
            <button onClick={() => {
              if (isFavoriteKink) {
                onRemoveFavorite(kink.id)
              } else {
                onAddFavorite(kink.id)
              }
            }}>
              {isFavoriteKink ? 'Remove Favorite' : 'Add Favorite'}
            </button>
          </Box>
        </Box>

        {/* Second row for Difficulty and Group indicator */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-start', // Align items to the start
            alignItems: 'center',
            gap: 1, // Space between items
            marginBottom: '10px', // Margin bottom for spacing
          }}
        >
          {kink.level && (
            <Chip
              label={kink.level.charAt(0).toUpperCase() + kink.level.slice(1)} // Capitalize the first letter for display
              sx={{
                backgroundColor: LEVEL_MAP[kink.level]?.color,
                color: '#FFFFFF',
              }}
            />
          )}
          {kink.is_group && (
            <Chip
              label="For Groups"
              icon={<GroupIcon />}
              variant="outlined"
            />
          )}
        </Box>

        {/* Categories */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap', // Allow wrapping
            gap: 1, // Space between chips
          }}
        >
          {kink.categories.map((category, index) => (
            <Chip
              key={index}
              label={category}
              variant="outlined"
            />
          ))}
        </Box>

        {kink.idea_description && (
          <Typography
            sx={{
              marginTop: '10px',
            }}
            variant="body2"
          >
            {kink.idea_description}
          </Typography>
        )}

        {kink.needs_supplies && (
          <Typography
            sx={{
              marginTop: '10px',
            }}
            variant="body2"
          >
            <strong>Supplies</strong>: {kink.needs_supplies}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default KinkCard;
