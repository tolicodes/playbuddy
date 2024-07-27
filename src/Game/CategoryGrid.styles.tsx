import { Card, Grid } from '@mui/material';
import { styled } from '@mui/system';

export const StyledCard = styled(Card)<{ selected: boolean }>(({ selected }) => ({
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: selected ? '#007bff' : '#ffffff',
    color: selected ? '#FFFFFF' : '#000000',
    // Add more styles for the selected state here, e.g., border color, text color, etc.
    cursor: 'pointer', // Optional: change cursor to pointer to indicate it's clickable
}));

export const IconContainer = styled('div')({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '16px',
});

export const LabelContainer = styled('div')({
    textAlign: 'center', // Center the text for longer labels
});

export const StyledRoot = styled('div')(({ theme }) => ({
    flexGrow: 1,
    padding: theme.spacing(3), // Use theme spacing for consistency
}));

export const StyledGridItem = styled(Grid)({
    item: true,
    xs: 6,
    sm: 4,
    md: 2,
});
