import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupIcon from '@mui/icons-material/Group';
import { Kink, LEVEL_MAP } from './types'; // Make sure the import path matches your file structure

const KinkCardHeader = ({ kink }: { kink: Kink }) => {
    return (
        <>
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
                <Typography variant="h5" component="h2">{kink.idea_title}</Typography>

                {/* Right-aligned icons for Done and Favorite */}
                {/* full width for the icons */}
                <Box sx={{ display: 'flex' }}>
                    {kink.status === 'done' && <CheckCircleIcon sx={{ color: 'green', fontSize: '25px', marginLeft: '8px' }} />}
                    {kink.favorite && <StarIcon sx={{ color: 'orange', fontSize: '25px', marginLeft: '8px' }} />}
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
                    <Chip key={index} label={category} variant="outlined" />
                ))}
            </Box>
        </>
    );
};

export default KinkCardHeader;
