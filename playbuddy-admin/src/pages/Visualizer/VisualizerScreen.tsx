import React from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import InstagramModule from "./InstagramModule";

const VisualizerScreen: React.FC = () => {
  return (
    <Box p={3}>
      <Stack spacing={2.5}>
        <Paper variant="outlined" sx={{ p: 2.5, background: "linear-gradient(120deg, #0ea5e9, #2563eb)", color: "#fff", borderColor: "rgba(255,255,255,0.45)" }}>
          <Stack spacing={0.5}>
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: -0.2 }}>
              Insta/Fetlife Visualizer
            </Typography>
            <Typography variant="body2" sx={{ color: "#fff", maxWidth: 820 }}>
              Explore Instagram and Fetlife follow graphs from cached data. Use the tabs to inspect weights, degrees, and mutuals.
            </Typography>
          </Stack>
        </Paper>

        <InstagramModule />
      </Stack>
    </Box>
  );
};

export default VisualizerScreen;
