import { Box, Typography, Button } from "@mui/material";
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'; // Import the game icon
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import LoginButton from "./LoginButton";

export const Header = () => {
    const navigate = useNavigate(); // Initialize the useNavigate hook

    const handlePlayGameClick = () => {
        navigate('/game'); // Navigate to /game when the button is clicked
    };

    const handeHomeClick = () => {
        navigate('/'); 
    }

    return (
        <Box sx={{ backgroundColor: '#f0f0f0', p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" onClick={handeHomeClick}>KinkBuddy</Typography>
            <Button variant="contained" startIcon={<SportsEsportsIcon />} onClick={handlePlayGameClick}>
                Play Game
            </Button>
            <LoginButton />
        </Box>
    );
}
