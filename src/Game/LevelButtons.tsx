import { Grid, Button } from "@mui/material";
import { Box } from "@mui/system";

const LevelButtons = () => {
    return (
        <Box sx={{ p: 1 }}>
            <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                    <Button fullWidth variant="contained" sx={{ backgroundColor: '#4caf50', '&:hover': { backgroundColor: '#388e3c' } }}>Easy</Button>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Button fullWidth variant="contained" sx={{ backgroundColor: '#2196f3', '&:hover': { backgroundColor: '#1976d2' } }}>Moderate</Button>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Button fullWidth variant="contained" sx={{ backgroundColor: '#f44336', '&:hover': { backgroundColor: '#d32f2f' } }}>Advanced</Button>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Button fullWidth variant="contained" sx={{ backgroundColor: '#000000', '&:hover': { backgroundColor: '#303030' } }}>Xtreme</Button>
                </Grid>
            </Grid>
        </Box>
    );
};

export default LevelButtons;