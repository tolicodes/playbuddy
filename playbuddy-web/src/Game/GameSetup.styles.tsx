import { Button } from '@mui/material';
import { Box } from '@mui/system';
import { styled } from '@mui/system';

export const StyledContainer = styled(Box)({
    padding: 16,
});

export const StyledScrollableBox = styled(Box)({
    flexGrow: 1,
    overflowY: 'auto',
    padding: 16,
});

export const StyledFooter = styled(Box)({
    backgroundColor: '#f0f0f0',
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'fixed',
    bottom: 0,
    width: '100%',
});

export const AdventureButton = styled(Button)({
    backgroundColor: '#4caf50',
    fontWeight: 'bold',
    '&:hover': {
        backgroundColor: '#388e3c',
    },
});
