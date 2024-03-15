import { Grid, Button } from "@mui/material";
import { Box } from "@mui/system";
import { LEVELS } from "../KinkLibrary/types";



const LevelButtons = () => {
  return (
    <Box sx={{ p: 1 }}>
      <Grid container spacing={2}>
        {LEVELS.map((level, index) => (
          <Grid item xs={6} sm={3} key={index}>
            <Button
              fullWidth
              variant="contained"
              sx={{
                backgroundColor: level.color,
                '&:hover': { backgroundColor: level.hoverColor },
              }}
            >
              {level.label}
            </Button>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default LevelButtons;
