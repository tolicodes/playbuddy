// src/App.tsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, Link as RouterLink } from "react-router-dom";
import { AppBar, Toolbar, Tabs, Tab, Box } from "@mui/material";
import WeeklyPicks from "./pages/WeeklyPicksScreen";
import AddEventScreen from "./pages/Events/EditEventScreen";
import FacilitatorsListScreen from "./pages/Facilitators/FacilitatorsListScreen";
import EditFacilitatorScreen from "./pages/Facilitators/EditFacilitatorScreen";
// import Organizers from "./pages/OrganizersScreen";
import LoginScreen from "./pages/LoginScreen";
import axios from 'axios'
import PrintRuns from "./pages/PrintRuns/PrintRunsAdmin";
import { PromoCodeEventManager } from "./pages/PromoCodes/PromoCodeEventManager";
import EventsListScreen from "./pages/Events/EventsListScreen";
import ImportCSVScreen from "./pages/Events/ImportCSVScreen";
import DeepLinksListScreen from "./pages/DeepLinks/DeepLinksListScreen";
import EditDeepLinkScreen from "./pages/DeepLinks/EditDeepLinksScreen";

// Suppose `sessionToken` is the current Supabase access token (JWT)
function setAxiosAuthHeader(sessionToken: string) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${sessionToken}`
}

const useAuth = () => {
  const sessionToken = localStorage.getItem('supabase.auth.token') || ''

  if (sessionToken) {
    setAxiosAuthHeader(sessionToken)
  }
}

export default function App() {
  // State to control which Tab is active
  const pathname = window.location.pathname;

  useAuth();

  // Determine the active tab index based on the current path
  const tabIndex = [
    '/',
    '/weekly-picks',
    '/events/add',
    '/facilitators',
    '/facilitators/new',
    '/facilitators/:id',
    '/print-runs',
    '/promo-codes',
    '/events/import-fetlife',
    '/deep-links',
    '/deep-links/new',
    '/deep-links/:id'
  ].indexOf(pathname);

  return (
    <Box>
      {/* Top AppBar with Tabs for navigation */}
      <AppBar position="sticky" color="primary">
        <Toolbar variant="dense">
          <Tabs value={tabIndex} textColor="inherit" indicatorColor="secondary">
            <Tab label="Login" component={RouterLink} to="/" />
            <Tab label="Weekly Picks" component={RouterLink} to="/weekly-picks" />
            <Tab label="Events" component={RouterLink} to="/events" />
            <Tab label="Facilitators" component={RouterLink} to="/facilitators" />
            <Tab label="Print Runs" component={RouterLink} to="/print-runs" />
            <Tab label="Promo Codes" component={RouterLink} to="/promo-codes" />
            <Tab label="Deep Links" component={RouterLink} to="/deep-links" />
          </Tabs>
        </Toolbar>
      </AppBar>

      {/* Route definitions */}
      <Routes>
        {/* <Route path="/organizers" element={<Organizers />} /> */}
        <Route path="/" element={<LoginScreen />} />
        <Route path="/weekly-picks" element={<WeeklyPicks />} />
        <Route path="/events" element={<EventsListScreen />} />
        <Route path="/events/add" element={<AddEventScreen />} />
        <Route path="/events/:id" element={<AddEventScreen />} />
        <Route path="/events/import-csv" element={<ImportCSVScreen />} />
        <Route path="/facilitators" element={<FacilitatorsListScreen />} />
        <Route path="/facilitators/new" element={<EditFacilitatorScreen />} />
        <Route path="/facilitators/:id" element={<EditFacilitatorScreen />} />
        <Route path="/print-runs" element={<PrintRuns />} />
        <Route path="/promo-codes" element={<PromoCodeEventManager />} />
        <Route path="/deep-links" element={<DeepLinksListScreen />} />
        <Route path="/deep-links/new" element={<EditDeepLinkScreen />} />
        <Route path="/deep-links/:id" element={<EditDeepLinkScreen />} />
      </Routes>
    </Box>
  );
}
