// src/App.tsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
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

  axios.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original: any = error?.config || {};
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
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const isLoginRoute = pathname === "/login";

  const [authReady, setAuthReady] = useState(false);

  // Init axios auth once and sync defaults on auth state changes
  useEffect(() => {
    initAxiosAuthOnce();

    let unsub: (() => void) | undefined;
    (async () => {
      await setDefaultAuthHeaderFromSession();
      const { data: { session } } = await supabaseClient.auth.getSession();
      const loggedIn = !!session?.access_token;

      if (!loggedIn && !isLoginRoute) {
        navigate("/login", { replace: true });
        return;
      }
      setAuthReady(true);

      const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, s) => {
        const token = s?.access_token ?? null;
        if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        else delete axios.defaults.headers.common["Authorization"];

        if (!token && !isLoginRoute) navigate("/login", { replace: true });
      });
      unsub = () => subscription.unsubscribe();
    })();

    return () => { unsub?.(); };
  }, [isLoginRoute, navigate]);

  // Guard on mount and on route changes (except /login)
  useEffect(() => {
    (async () => {
      if (isLoginRoute) {
        setAuthReady(true);
        return;
      }
      let { data: { session } } = await supabaseClient.auth.getSession();
      const now = Math.floor(Date.now() / 1000);
      if (!session || (session.expires_at ?? 0) <= now + 5) {
        const { data, error } = await supabaseClient.auth.refreshSession();
        if (!error) session = data.session;
      }
      const { data, error } = await supabaseClient.auth.getUser();
      if (error || !data.user) {
        navigate("/login", { replace: true });
        return;
      }
      setAuthReady(true);
    })();
  }, [pathname, isLoginRoute, navigate]);

  // Tabs: map + prefix-match so /events/:id stays selected
  const tabRoutes = [
    "/weekly-picks",
    "/events",
    "/promo-codes",
    "/deep-links",
    "/facilitators",
    "/print-runs",
    "/events/import-urls",
  ];

  const currentTabIndex = tabRoutes.findIndex(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );

  if (!authReady) {
    return <Box p={2} color="#6B7280">Checking session…</Box>;
  }

  return (
    <Box>
      <AppBar position="sticky" color="primary">
        <Toolbar variant="dense">
          <Tabs
            value={currentTabIndex >= 0 ? currentTabIndex : false}
            textColor="inherit"
            indicatorColor="secondary"
            variant="scrollable"
            scrollButtons
            allowScrollButtonsMobile
          >
            <Tab label="Weekly Picks" component={RouterLink} to="/weekly-picks" />
            <Tab label="Import URLs" component={RouterLink} to="/events/import-urls" />
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
        <Route path="*" element={<Navigate to="/weekly-picks" replace />} />
      </Routes>
    </Box>
  );
}
