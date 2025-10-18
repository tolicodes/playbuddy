// src/App.tsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, Link as RouterLink } from "react-router-dom";
import { AppBar, Toolbar, Tabs, Tab, Box } from "@mui/material";
import WeeklyPicks from "./pages/WeeklyPicks/WeeklyPicksScreen";
import AddEventScreen from "./pages/Events/EditEventScreen";
import FacilitatorsListScreen from "./pages/Facilitators/FacilitatorsListScreen";
import EditFacilitatorScreen from "./pages/Facilitators/EditFacilitatorScreen";
import LoginScreen from "./pages/LoginScreen";
import axios from "axios";
import PrintRuns from "./pages/PrintRuns/PrintRunsAdmin";
import { PromoCodeEventManager } from "./pages/PromoCodes/PromoCodeEventManager";
import EventsListScreen from "./pages/Events/EventsListScreen";
import ImportCSVScreen from "./pages/Events/ImportCSVScreen";
import DeepLinksListScreen from "./pages/DeepLinks/DeepLinksListScreen";
import EditDeepLinkScreen from "./pages/DeepLinks/EditDeepLinksScreen";
import ImportEventURLsScreen from "./pages/Events/ImportEventURLsScreen";
import { supabaseClient } from "./lib/supabaseClient";

// ---------- Global axios auth (no instances) ----------
let axiosAuthInitialized = false;

async function setDefaultAuthHeaderFromSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  const token = session?.access_token ?? null;
  if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else delete axios.defaults.headers.common["Authorization"];
}

function initAxiosAuthOnce() {
  if (axiosAuthInitialized) return;
  axiosAuthInitialized = true;

  // Pre-attach a fresh token before every request (refresh if near expiry)
  axios.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const now = Math.floor(Date.now() / 1000);
    let s = session;

    if (!s || (s.expires_at ?? 0) <= now + 5) {
      const { data, error } = await supabaseClient.auth.refreshSession();
      if (!error) s = data.session;
    }

    const token = s?.access_token ?? null;
    if (token) {
      (config.headers as any).Authorization = `Bearer ${token}`;
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete (config.headers as any).Authorization;
      delete axios.defaults.headers.common["Authorization"];
    }
    return config;
  });

  // Retry once on 401 after an explicit refresh
  axios.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error?.config || {};
      if (error?.response?.status === 401 && !original._retry) {
        original._retry = true;
        try {
          const { data, error: refreshErr } = await supabaseClient.auth.refreshSession();
          if (refreshErr) throw refreshErr;

          const token = data.session?.access_token ?? null;
          if (token) {
            original.headers = { ...(original.headers || {}), Authorization: `Bearer ${token}` };
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          } else {
            if (original.headers) delete original.headers.Authorization;
            delete axios.defaults.headers.common["Authorization"];
          }
          return axios(original);
        } catch (e) {
          await supabaseClient.auth.signOut();
          return Promise.reject(e);
        }
      }
      return Promise.reject(error);
    }
  );
}
// ------------------------------------------------------

export default function App() {
  const pathname = window.location.pathname;
  const [authReady, setAuthReady] = useState(false); // to avoid flicker
  const isLoginRoute = pathname === "/login";

  // Init axios auth once and sync defaults on auth state changes
  useEffect(() => {
    initAxiosAuthOnce();

    let unsub: (() => void) | undefined;
    (async () => {
      await setDefaultAuthHeaderFromSession();
      const { data: { session } } = await supabaseClient.auth.getSession();
      const loggedIn = !!session?.access_token;

      // If not logged in and not on /login, redirect
      if (!loggedIn && !isLoginRoute) {
        window.location.href = "/login";
        return;
      }
      setAuthReady(true);

      // Keep axios.defaults synced as Supabase rotates tokens
      const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, s) => {
        const token = s?.access_token ?? null;
        if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        else delete axios.defaults.headers.common["Authorization"];

        // If user becomes logged out, push to login unless already there
        if (!token && !isLoginRoute) window.location.href = "/login";
      });
      unsub = () => subscription.unsubscribe();
    })();

    return () => { unsub?.(); };
  }, [isLoginRoute]);

  // Guard on first mount and when path changes (except /login):
  useEffect(() => {
    (async () => {
      if (isLoginRoute) {
        setAuthReady(true);
        return;
      }
      // Ensure fresh session and verify user
      let { data: { session } } = await supabaseClient.auth.getSession();
      const now = Math.floor(Date.now() / 1000);
      if (!session || (session.expires_at ?? 0) <= now + 5) {
        const { data, error } = await supabaseClient.auth.refreshSession();
        if (!error) session = data.session;
      }
      const { data, error } = await supabaseClient.auth.getUser();
      if (error || !data.user) {
        window.location.href = "/login";
        return;
      }
      setAuthReady(true);
    })();
  }, [pathname, isLoginRoute]);

  // Tabs index (best-effort; dynamic params won't match exactly)
  const tabIndex = [
    "/login",
    "/weekly-picks",
    "/events/add",
    "/facilitators",
    "/facilitators/new",
    "/facilitators/:id",
    "/print-runs",
    "/promo-codes",
    "/events/import-fetlife",
    "/events/import-urls",
    "/deep-links",
    "/deep-links/new",
    "/deep-links/:id",
  ].indexOf(pathname);

  if (!authReady) {
    return <Box p={2} color="#6B7280">Checking session…</Box>;
  }

  return (
    <Box>
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
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/weekly-picks" replace />} />
      </Routes>
    </Box>
  );
}
