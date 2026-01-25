// src/App.tsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Autocomplete,
  Box,
  Button,
  InputAdornment,
  Menu,
  MenuItem,
  TextField,
  Toolbar,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
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
import EventDuplicatesScreen from "./pages/Events/EventDuplicatesScreen";
import PartifulInviteScreen from "./pages/Events/PartifulInviteScreen";
import { supabaseClient } from "./lib/supabaseClient";
import JobsScreen from "./pages/Jobs/JobsScreen";
import VisualizerScreen from "./pages/Visualizer/VisualizerScreen";
import ImportSourcesScreen from "./pages/ImportSources/ImportSourcesScreen";
import OrganizerManager from "./pages/Organizers/OrganizerManager";
import EventPopupsScreen from "./pages/EventPopups/EventPopupsScreen";
import PushNotificationsScreen from "./pages/PushNotifications/PushNotificationsScreen";
import BranchStatsScreen from "./pages/BranchStats/BranchStatsScreen";
import AnalyticsScreen from "./pages/Analytics/AnalyticsScreen";
import LocationAreasScreen from "./pages/LocationAreas/LocationAreasScreen";
import ScrapeJobsStatusBar from "./components/ScrapeJobsStatusBar";

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

type NavItem = {
  label: string;
  path: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

type NavSearchOption = NavItem & {
  group: string;
};

const navGroups: NavGroup[] = [
  {
    label: "Events",
    items: [
      { label: "Weekly Picks", path: "/weekly-picks" },
      { label: "Events", path: "/events" },
      { label: "Find Duplicates", path: "/events/duplicates" },
      { label: "Import URLs", path: "/events/import-urls" },
      { label: "Partiful", path: "/events/partiful" },
      { label: "Popups", path: "/event-popups" },
      { label: "Location Areas", path: "/location-areas" },
    ],
  },
  {
    label: "Growth",
    items: [
      { label: "Promo Codes", path: "/promo-codes" },
      { label: "Deep Links", path: "/deep-links" },
      { label: "Branch Stats", path: "/branch-stats" },
      { label: "Print Runs", path: "/print-runs" },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Facilitators", path: "/facilitators" },
      { label: "Organizers", path: "/organizers/manage" },
    ],
  },
  {
    label: "Ops",
    items: [
      { label: "Import Sources", path: "/import-sources" },
      { label: "Jobs", path: "/jobs" },
      { label: "Push Notifications", path: "/push-notifications" },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Analytics", path: "/analytics" },
      { label: "Insta/Fetlife Visualizer", path: "/visualizer" },
    ],
  },
];

const navSearchOptions: NavSearchOption[] = navGroups.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.label }))
);

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const isLoginRoute = pathname === "/login";

  const [authReady, setAuthReady] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [openMenuGroup, setOpenMenuGroup] = useState<NavGroup | null>(null);
  const [navSearchInput, setNavSearchInput] = useState("");

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

  const matchesRoute = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  const activeNavItem = navSearchOptions
    .filter((item) => matchesRoute(item.path))
    .sort((a, b) => b.path.length - a.path.length)[0];

  const activeGroup = activeNavItem?.group;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, group: NavGroup) => {
    setMenuAnchorEl(event.currentTarget);
    setOpenMenuGroup(group);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setOpenMenuGroup(null);
  };

  const handleSearchSelect = (_event: React.SyntheticEvent, value: NavSearchOption | null) => {
    if (value) navigate(value.path);
    setNavSearchInput("");
  };

  if (!authReady) {
    return <Box p={2} color="#6B7280">Checking session…</Box>;
  }

  return (
    <Box>
      <AppBar position="sticky" color="primary">
        <Toolbar variant="dense" sx={{ gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", flexGrow: 1 }}>
            {navGroups.map((group) => {
              const groupActive = activeGroup === group.label;
              const menuOpen = openMenuGroup?.label === group.label && Boolean(menuAnchorEl);
              return (
                <Button
                  key={group.label}
                  color="inherit"
                  variant="text"
                  disableElevation
                  size="small"
                  onClick={(event) => handleMenuOpen(event, group)}
                  endIcon={<KeyboardArrowDownIcon />}
                  aria-haspopup="true"
                  aria-expanded={menuOpen ? "true" : undefined}
                  aria-controls={menuOpen ? "admin-nav-menu" : undefined}
                  sx={{
                    textTransform: "none",
                    fontWeight: groupActive ? 700 : 500,
                    borderBottom: groupActive ? "2px solid rgba(255,255,255,0.8)" : "2px solid transparent",
                    borderRadius: 0,
                    lineHeight: 1.4,
                    color: "rgba(255,255,255,0.92)",
                    backgroundColor: groupActive ? "rgba(255,255,255,0.12)" : "transparent",
                    "&:hover": {
                      backgroundColor: "rgba(255,255,255,0.18)",
                    },
                  }}
                >
                  {group.label}
                </Button>
              );
            })}
          </Box>
          <Autocomplete
            size="small"
            inputValue={navSearchInput}
            onInputChange={(_event, value, reason) => {
              if (reason === "input" || reason === "clear") {
                setNavSearchInput(value);
              }
            }}
            onChange={handleSearchSelect}
            options={navSearchOptions}
            groupBy={(option) => option.group}
            getOptionLabel={(option) => option.label}
            clearOnEscape
            sx={{
              minWidth: 220,
              width: { xs: "100%", sm: 260 },
              "& .MuiOutlinedInput-root": {
                backgroundColor: "rgba(255,255,255,0.92)",
              },
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search tabs"
                variant="outlined"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </Toolbar>
      </AppBar>
      <ScrapeJobsStatusBar sx={{ mx: 2 }} />
      <Menu
        id="admin-nav-menu"
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        MenuListProps={{ dense: true }}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        {openMenuGroup?.items.map((item) => (
          <MenuItem
            key={item.path}
            component={RouterLink}
            to={item.path}
            selected={activeNavItem?.path === item.path}
            onClick={handleMenuClose}
          >
            {item.label}
          </MenuItem>
        ))}
      </Menu>

      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/weekly-picks" element={<WeeklyPicks />} />
        <Route path="/events" element={<EventsListScreen />} />
        <Route path="/events/duplicates" element={<EventDuplicatesScreen />} />
        <Route path="/events/add" element={<AddEventScreen />} />
        <Route path="/events/partiful" element={<PartifulInviteScreen />} />
        <Route path="/events/:id" element={<AddEventScreen />} />
        <Route path="/events/import-csv" element={<ImportCSVScreen />} />
        <Route path="/events/import-urls" element={<ImportEventURLsScreen />} />
        <Route path="/location-areas" element={<LocationAreasScreen />} />
        <Route path="/facilitators" element={<FacilitatorsListScreen />} />
        <Route path="/facilitators/new" element={<EditFacilitatorScreen />} />
        <Route path="/facilitators/:id" element={<EditFacilitatorScreen />} />
        <Route path="/print-runs" element={<PrintRuns />} />
        <Route path="/promo-codes" element={<PromoCodeEventManager />} />
        <Route path="/deep-links" element={<DeepLinksListScreen />} />
        <Route path="/deep-links/new" element={<EditDeepLinkScreen />} />
        <Route path="/branch-stats" element={<BranchStatsScreen />} />
        <Route path="/analytics" element={<AnalyticsScreen />} />
        <Route path="/event-popups" element={<EventPopupsScreen />} />
        <Route path="/push-notifications" element={<PushNotificationsScreen />} />
        <Route path="/jobs" element={<JobsScreen />} />
        <Route path="/visualizer" element={<VisualizerScreen />} />
        <Route path="/import-sources" element={<ImportSourcesScreen />} />
        <Route path="/organizers/manage" element={<OrganizerManager />} />
        <Route path="/deep-links/:id" element={<EditDeepLinkScreen />} />
        <Route path="*" element={<Navigate to="/weekly-picks" replace />} />
      </Routes>
    </Box>
  );
}
