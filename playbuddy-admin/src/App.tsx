// src/App.tsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, Link as RouterLink } from "react-router-dom";
import { AppBar, Toolbar, Tabs, Tab, Box } from "@mui/material";
import WeeklyPicks from "./pages/WeeklyPicks/WeeklyPicksScreen";
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
import ImportEventURLsScreen from "./pages/Events/ImportEventURLsScreen";
import { supabaseClient } from "./lib/supabaseClient";

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
    '/login',
    '/weekly-picks',
    '/events/add',
    '/facilitators',
    '/facilitators/new',
    '/facilitators/:id',
    '/print-runs',
    '/promo-codes',
    '/events/import-fetlife',
    '/events/import-urls',
    '/deep-links',
    '/deep-links/new',
    '/deep-links/:id'
  ].indexOf(pathname);

  useEffect(() => {
    (async () => {
      if (pathname === '/login') return
      const { data, error } = await supabaseClient.auth.getUser()
      if (error || !data.user) {
        window.location.href = '/login'
      }
    })()
  }, [])

  return (
    <Box>
      {/* Top AppBar with Tabs for navigation */}
      <AppBar position="sticky" color="primary">
        <Toolbar variant="dense">
          <Tabs value={tabIndex} textColor="inherit" indicatorColor="secondary">
            <Tab label="Weekly Picks" component={RouterLink} to="/weekly-picks" />
            <Tab label="Events" component={RouterLink} to="/events" />
            <Tab label="Promo Codes" component={RouterLink} to="/promo-codes" />
            <Tab label="Deep Links" component={RouterLink} to="/deep-links" />
            <Tab label="Facilitators" component={RouterLink} to="/facilitators" />
            <Tab label="Print Runs" component={RouterLink} to="/print-runs" />
          </Tabs>
        </Toolbar>
      </AppBar>

      {/* Route definitions */}
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/weekly-picks" element={<WeeklyPicks />} />
        <Route path="/events" element={<EventsListScreen />} />
        <Route path="/events/add" element={<AddEventScreen />} />
        <Route path="/events/:id" element={<AddEventScreen />} />
        <Route path="/events/import-csv" element={<ImportCSVScreen />} />
        <Route path="/events/import-urls" element={<ImportEventURLsScreen />} />
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
