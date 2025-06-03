// src/index.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";

// 1) React Query client (v4)
const queryClient = new QueryClient();

// 3) MUI custom theme (PlayBuddy purple)
const theme = createTheme({
  palette: {
    primary: {
      light: "#C5A3FF",
      main: "#7F2BEB",
      dark: "#4C00AA",
      contrastText: "#fff",
    },
    background: { default: "#f5f5f5" },
  },
  components: {
    MuiButton: {
      defaultProps: { variant: "contained" },
      styleOverrides: {
        root: { borderRadius: 24 },
      },
    },
  },
});

const container = document.getElementById("root")!;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
