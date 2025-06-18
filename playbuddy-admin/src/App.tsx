// src/App.tsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, Link as RouterLink } from "react-router-dom";
import { AppBar, Toolbar, Tabs, Tab, Box } from "@mui/material";
import WeeklyPicks from "./pages/WeeklyPicksScreen";
import AddEventScreen from "./pages/AddEventScreen";
import FacilitatorsListScreen from "./pages/Facilitators/FacilitatorsListScreen";
import EditFacilitatorScreen from "./pages/Facilitators/EditFacilitatorScreen";
// import Organizers from "./pages/OrganizersScreen";
import LoginScreen from "./pages/LoginScreen";
import axios from 'axios'
import PrintRuns from "./pages/PrintRuns/PrintRunsAdmin";

// Suppose `sessionToken` is the current Supabase access token (JWT)
function setAxiosAuthHeader(sessionToken: string) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${sessionToken}`
}

const useAuth = () => {
  const [sessionToken, setSessionToken] = useState<string>(
    localStorage.getItem('supabase.auth.token') || ''
  )

  useEffect(() => {
    if (sessionToken) {
      setAxiosAuthHeader(sessionToken)
    }
  }, [sessionToken])
}

export default function App() {
  // State to control which Tab is active
  const pathname = window.location.pathname;

  useAuth();

  const tabIndexes = {
    "/weekly-picks": 0,
    "/events/add": 1,
    "/facilitators": 2,
    "/facilitators/:id": 3,
    "/facilitators/new": 4,
    "/login": 5,
    "/print-runs": 6
  };

  const tabIndex = tabIndexes[pathname as keyof typeof tabIndexes];

  return (
    <Box>
      {/* Top AppBar with Tabs for navigation */}
      <AppBar position="sticky" color="primary">
        <Toolbar variant="dense">
          <Tabs value={tabIndex} textColor="inherit" indicatorColor="secondary">
            <Tab label="Login" component={RouterLink} to="/login" />
            <Tab label="Weekly Picks" component={RouterLink} to="/weekly-picks" />
            <Tab label="Events" component={RouterLink} to="/events/add" />
            <Tab label="Facilitators" component={RouterLink} to="/facilitators" />
            <Tab label="Print Runs" component={RouterLink} to="/print-runs" />
          </Tabs>
        </Toolbar>
      </AppBar>

      {/* Route definitions */}
      <Routes>
        {/* <Route path="/organizers" element={<Organizers />} /> */}
        <Route path="/weekly-picks" element={<WeeklyPicks />} />
        <Route path="/events/add" element={<AddEventScreen />} />
        <Route path="/facilitators" element={<FacilitatorsListScreen />} />
        <Route path="/facilitators/new" element={<EditFacilitatorScreen />} />
        <Route path="/facilitators/:id" element={<EditFacilitatorScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/print-runs" element={<PrintRuns />} />
      </Routes>
    </Box>
  );
}
