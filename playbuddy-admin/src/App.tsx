// src/App.tsx
import React from "react";
import { Routes, Route, Navigate, Link as RouterLink } from "react-router-dom";
import { AppBar, Toolbar, Tabs, Tab, Box } from "@mui/material";
import WeeklyPicks from "./pages/WeeklyPicksScreen";
import Organizers from "./pages/OrganizersScreen";

export default function App() {
  // State to control which Tab is active
  const pathname = window.location.pathname;

  const tabIndexes = {
    "/organizers": 0,
    "/weekly-picks": 1,
  };

  const tabIndex = tabIndexes[pathname as keyof typeof tabIndexes];

  return (
    <Box>
      {/* Top AppBar with Tabs for navigation */}
      <AppBar position="sticky" color="primary">
        <Toolbar variant="dense">
          <Tabs value={tabIndex} textColor="inherit" indicatorColor="secondary">
            <Tab label="Organizers" component={RouterLink} to="/organizers" />
            <Tab label="Weekly Picks" component={RouterLink} to="/weekly-picks" />
          </Tabs>
        </Toolbar>
      </AppBar>

      {/* Route definitions */}
      <Routes>
        <Route path="/organizers" element={<Organizers />} />
        <Route path="/weekly-picks" element={<WeeklyPicks />} />
      </Routes>
    </Box>
  );
}
