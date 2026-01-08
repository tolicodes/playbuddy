import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Alert, Autocomplete, Backdrop, Box, Button, Chip, CircularProgress, Divider, FormControlLabel, Paper, Stack, Switch, Tab, Tabs, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { API_BASE_URL } from "../../common/config";
import { DerivedData, GraphLink, GraphNode } from "./instagramTypes";
import { buildVisualizerData, SourceFilter } from "./deriveGraph";
import CopyButton from "./components/CopyButton";
import ForceGraph from "./components/ForceGraph";
import UserRow from "./components/UserRow";
import SecondDegreesTab from "./tabs/SecondDegreesTab";

const normalizeUsername = (u?: string) => (u || "").trim().replace(/^@+/, "").toLowerCase();
const formatNumber = (n: number) => n.toLocaleString();
const IG_ANCHOR = normalizeUsername("kinkypeanutbutter");
const FET_ANCHOR = normalizeUsername("_peanutbutter");
const GRAPH_CACHE_KEY = "pb_ig_graph_cache_v1";
const FILES_CACHE_KEY = "pb_ig_files_cache_v1";
const MAX_CACHE_LEN = 4_000_000; // ~4MB limit guard
const COVERAGE_LIMIT = 400; // keep coverage tab snappy

let memoryGraphCache: { nodes: any[]; links: any[] } | null = null;
let memoryFilesCache: { data: Record<string, string[]> } | null = null;

const tryStore = (key: string, payload: any) => {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(payload);
    if (serialized.length > MAX_CACHE_LEN) return;
    window.localStorage.setItem(key, serialized);
  } catch {
    // swallow quota/serialize errors
  }
};

const StatTile: React.FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
  <Paper
    variant="outlined"
    sx={{
      p: 1.75,
      background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
      borderColor: "rgba(255,255,255,0.08)",
      color: "#fff",
    }}
  >
    <Typography variant="caption" sx={{ color: "#fff", letterSpacing: 0.3 }}>
      {label}
    </Typography>
    <Typography variant="h5" sx={{ color: "#fff", fontWeight: 700, lineHeight: 1.3 }}>
      {value}
    </Typography>
    {hint && (
      <Typography variant="body2" sx={{ color: "#fff" }}>
        {hint}
      </Typography>
    )}
  </Paper>
);

const InstagramModule: React.FC = () => {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphLinks, setGraphLinks] = useState<GraphLink[]>([]);
  const [derived, setDerived] = useState<DerivedData>(() => ({
    nodeMap: new Map(),
    rawNodeMap: new Map(),
    followerCountMap: new Map(),
    followingCountMap: new Map(),
    rawFollowerCountMap: new Map(),
    rawFollowingCountMap: new Map(),
    filteredCountMap: new Map(),
    sortedFollowers: new Map(),
    sortedFollowingFiltered: new Map(),
    sortedFollowersRaw: new Map(),
    sortedFollowingRaw: new Map(),
    topWeight: [],
    topFollowers: [],
    topFollowing: [],
    followingUsers: [],
    followerOnly: [],
    secondDegree: [],
    options: [],
    stats: {
      nodes: "0",
      totalNodes: "0",
      edges: "0",
      totalEdges: "0",
      filesIn: "0",
      filesOut: "0",
      topNode: "n/a",
      totalHandles: "0",
      handles3Plus: "0",
    },
  }));
  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"leaderboard" | "graph" | "lookup" | "mutual" | "coverage" | "second">("leaderboard");
  const [leaderboardSort, setLeaderboardSort] = useState<"weight" | "followers" | "following">("weight");
  const [showRawLookup, setShowRawLookup] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [lookupValue, setLookupValue] = useState<string>("");
  const [mutualA, setMutualA] = useState<string>("kinkypeanutbutter");
  const [mutualB, setMutualB] = useState<string>("");
  const [fileBuckets, setFileBuckets] = useState<Record<string, string[]>>({});
  const [rawGraph, setRawGraph] = useState<{ nodes: any[]; links: any[] } | null>(null);
  const hasGraphCache = useRef(false);
  const hasFilesCache = useRef(false);
  const workerRef = useRef<Worker | null>(null);
  const computeIdRef = useRef(0);

  const anchorHandle = useMemo(() => (sourceFilter === "instagram" ? IG_ANCHOR : FET_ANCHOR), [sourceFilter]);
  const anchorLabel = sourceFilter === "instagram" ? "kinkypeanutbutter" : "_peanutbutter";

  const fetchWithFallback = useCallback(async (path: string) => {
    try {
      return await axios.get(`${API_BASE_URL}${path}`);
    } catch {
      return axios.get(path);
    }
  }, []);

  useEffect(() => {
    if (typeof Worker === "undefined") return;
    const worker = new Worker(new URL("./visualizerWorker.ts", import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<{ id: number; nodes?: GraphNode[]; links?: GraphLink[]; graphNodes?: GraphNode[]; graphLinks?: GraphLink[]; derived?: DerivedData; error?: string }>) => {
      const { id, nodes: nextNodes, graphNodes: nextGraphNodes, graphLinks: nextGraphLinks, derived: nextDerived, error: computeError } = event.data || {};
      if (id !== computeIdRef.current) return;
      if (computeError) {
        setError(computeError);
        setComputing(false);
        return;
      }
      if (nextNodes) setNodes(nextNodes);
      if (nextGraphNodes) setGraphNodes(nextGraphNodes);
      if (nextGraphLinks) setGraphLinks(nextGraphLinks);
      if (nextDerived) {
        setDerived(nextDerived);
        setError(null);
      }
      setComputing(false);
    };

    worker.onerror = (err) => {
      console.error("Visualizer worker failed", err);
      setError("Visualizer worker failed");
      setComputing(false);
      worker.terminate();
      workerRef.current = null;
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const requestCompute = useCallback(
    (graph: { nodes: any[]; links: any[] } | null, buckets?: Record<string, string[]>) => {
      const id = ++computeIdRef.current;
      setComputing(true);
      const worker = workerRef.current;
      if (!graph) {
        setDerived((prev) => ({
          ...prev,
          nodeMap: new Map(),
          rawNodeMap: new Map(),
          followerCountMap: new Map(),
          followingCountMap: new Map(),
          rawFollowerCountMap: new Map(),
          rawFollowingCountMap: new Map(),
          filteredCountMap: new Map(),
          sortedFollowers: new Map(),
          sortedFollowingFiltered: new Map(),
          sortedFollowersRaw: new Map(),
          sortedFollowingRaw: new Map(),
          topWeight: [],
          topFollowers: [],
          topFollowing: [],
          followingUsers: [],
          followerOnly: [],
          secondDegree: [],
          options: [],
          stats: {
            nodes: "0",
            totalNodes: "0",
            edges: "0",
            totalEdges: "0",
            filesIn: formatNumber(buckets?.input?.length || 0),
            filesOut: formatNumber(buckets?.output?.length || 0),
            topNode: "n/a",
            totalHandles: "0",
            handles3Plus: "0",
          },
        }));
        setNodes([]);
        setGraphNodes([]);
        setGraphLinks([]);
        setComputing(false);
        return;
      }
      if (!worker) {
        try {
          const { nodes: nextNodes, graphNodes: nextGraphNodes, graphLinks: nextGraphLinks, derived: nextDerived } = buildVisualizerData(
            graph.nodes,
            graph.links,
            sourceFilter,
            anchorHandle,
            buckets
          );
          setNodes(nextNodes);
          setGraphNodes(nextGraphNodes || []);
          setGraphLinks(nextGraphLinks || []);
          setDerived(nextDerived);
          setError(null);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to compute visualizer data";
          setError(message);
        } finally {
          setComputing(false);
        }
        return;
      }
      worker.postMessage({ id, rawNodes: graph.nodes, rawLinks: graph.links, sourceFilter, anchorHandle, buckets });
    },
    [anchorHandle, sourceFilter]
  );

  const loadFollowing = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!hasGraphCache.current) {
      setNodes([]);
      setGraphNodes([]);
      setGraphLinks([]);
    }
    try {
      const res = await fetchWithFallback(`/visualizer/following-graph`);
      const rawNodes = Array.isArray((res as any)?.data?.nodes) ? (res as any).data.nodes : [];
      const rawLinks = Array.isArray((res as any)?.data?.links) ? (res as any).data.links : [];
      setRawGraph({ nodes: rawNodes, links: rawLinks });
      memoryGraphCache = { nodes: rawNodes, links: rawLinks };
      tryStore(GRAPH_CACHE_KEY, { nodes: rawNodes, links: rawLinks, ts: Date.now() });
    } catch (err: any) {
      console.error("Failed to load following graph", err);
      setError(err?.message || "Failed to load following graph");
    } finally {
      setLoading(false);
    }
  }, [fetchWithFallback]);

  const loadFileBuckets = useCallback(async () => {
    try {
      const res = await fetchWithFallback(`/visualizer/files`);
      if ((res as any)?.data && typeof (res as any).data === "object") {
        const nextBuckets = (res as any).data;
        setFileBuckets(nextBuckets);
        memoryFilesCache = { data: nextBuckets };
        tryStore(FILES_CACHE_KEY, { data: nextBuckets, ts: Date.now() });
      }
    } catch (err) {
      console.warn("Unable to list data files", err);
    }
  }, [fetchWithFallback]);

  useEffect(() => {
    // hydrate from in-memory cache first
    if (memoryGraphCache) {
      setRawGraph({ nodes: memoryGraphCache.nodes, links: memoryGraphCache.links });
      hasGraphCache.current = true;
    }
    if (memoryFilesCache) {
      setFileBuckets(memoryFilesCache.data);
      hasFilesCache.current = true;
    }

    // then attempt localStorage hydration
    if (!hasGraphCache.current && typeof window !== "undefined") {
      const cachedGraph = localStorage.getItem(GRAPH_CACHE_KEY);
      if (cachedGraph) {
        try {
          const parsed = JSON.parse(cachedGraph);
          if (Array.isArray(parsed.nodes) && Array.isArray(parsed.links)) {
            setRawGraph({ nodes: parsed.nodes, links: parsed.links });
            hasGraphCache.current = true;
          }
        } catch {
          // ignore cache parse errors
        }
      }
    }
    if (!hasFilesCache.current && typeof window !== "undefined") {
      const cachedFiles = localStorage.getItem(FILES_CACHE_KEY);
      if (cachedFiles) {
        try {
          const parsed = JSON.parse(cachedFiles);
          if (parsed?.data && typeof parsed.data === "object") {
            setFileBuckets(parsed.data);
            hasFilesCache.current = true;
          }
        } catch {
          // ignore cache parse errors
        }
      }
    }
    loadFollowing();
    loadFileBuckets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    requestCompute(rawGraph, fileBuckets);
  }, [fileBuckets, rawGraph, requestCompute]);

  const highlightHandles = useMemo(() => {
    const s = new Set<string>([anchorHandle]);
    const anchorNode = nodes.find((n) => n.username === anchorHandle);
    anchorNode?.followers.forEach((u) => s.add(u));
    anchorNode?.following.forEach((u) => s.add(u));
    return s;
  }, [anchorHandle, nodes]);

  const anchorFollowing = useMemo(() => {
    const set = new Set<string>();
    const anchorNode = nodes.find((n) => n.username === anchorHandle);
    anchorNode?.following.forEach((u) => set.add(u));
    return set;
  }, [anchorHandle, nodes]);

  const anchorFollowingRaw = useMemo(() => {
    return new Set<string>(derived.sortedFollowingRaw.get(anchorHandle) ?? []);
  }, [anchorHandle, derived.sortedFollowingRaw]);

  const leaderboardList =
    leaderboardSort === "weight"
      ? derived.topWeight
      : leaderboardSort === "followers"
        ? derived.topFollowers
        : derived.topFollowing;

  const handleColor = useCallback(
    (u: string) => (highlightHandles.has(normalizeUsername(u)) ? "#fbbf24" : "#fff"),
    [highlightHandles]
  );

  const degreeLabel = useCallback(
    (u: string) => {
      const key = normalizeUsername(u);
      const node = derived.nodeMap.get(key);
      const inAnchorFollowing = anchorFollowing.has(key);
      const followingCount = derived.followingCountMap.get(key) ?? node?.followingCount ?? 0;
      if (inAnchorFollowing && followingCount > 0) return "1st+";
      if (inAnchorFollowing) return "1st";
      return "2nd";
    },
    [anchorFollowing, derived.followingCountMap, derived.nodeMap]
  );

  const degreeLabelRaw = useCallback(
    (u: string) => {
      const key = normalizeUsername(u);
      const node = derived.rawNodeMap.get(key) ?? derived.nodeMap.get(key);
      const inAnchorFollowing = anchorFollowingRaw.has(key);
      const followingCount = derived.rawFollowingCountMap.get(key) ?? node?.followingCount ?? 0;
      if (inAnchorFollowing && followingCount > 0) return "1st+";
      if (inAnchorFollowing) return "1st";
      return "2nd";
    },
    [anchorFollowingRaw, derived.nodeMap, derived.rawFollowingCountMap, derived.rawNodeMap]
  );

  const handleSelectUser = useCallback(
    (u: string) => {
      const norm = normalizeUsername(u);
      if (!norm) return;
      setLookupValue(norm);
      setTab("lookup");
    },
    []
  );

  const isBusy = loading || computing;

  return (
    <>
      <Backdrop
        open={isBusy}
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.modal + 2,
          backgroundColor: "rgba(15, 23, 42, 0.82)",
          backdropFilter: "blur(3px)",
        }}
      >
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress color="inherit" />
          <Typography variant="body2">Crunching graph data...</Typography>
        </Stack>
      </Backdrop>
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          background: "linear-gradient(145deg, #0f172a, #0b1224 36%, #0b1224 60%, #0f172a)",
          borderColor: "rgba(255,255,255,0.06)",
          color: "#fff",
        }}
      >
        <Stack spacing={3}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h5" sx={{ color: "#fff", letterSpacing: -0.2 }}>
                Follow graph visualizer
              </Typography>
              <Chip label="Insta/Fetlife" size="small" sx={{ bgcolor: "rgba(255,255,255,0.1)", color: "#fff" }} />
            </Stack>
            <Typography variant="body2" sx={{ color: "#fff", maxWidth: 720, mt: 0.5 }}>
              Builds a follow graph from cached data files and highlights the highest-weight handles.
            </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center" flexWrap="wrap">
            <Chip label={`1st: in ${anchorLabel} following`} size="small" sx={{ bgcolor: "rgba(59,130,246,0.16)", color: "#fff" }} />
            <Chip label="1st+: 1st with their own following" size="small" sx={{ bgcolor: "rgba(16,185,129,0.15)", color: "#fff" }} />
            <Chip label="2nd: everyone else" size="small" sx={{ bgcolor: "rgba(148,163,184,0.2)", color: "#fff" }} />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center" flexWrap="wrap">
            <Chip label={`input (raw): ${derived.stats.filesIn}`} size="small" sx={{ bgcolor: "rgba(59,130,246,0.16)", color: "#fff", borderColor: "rgba(59,130,246,0.35)", borderWidth: 1, borderStyle: "solid" }} />
            <Chip label={`output (raw): ${derived.stats.filesOut}`} size="small" sx={{ bgcolor: "rgba(16,185,129,0.15)", color: "#fff", borderColor: "rgba(16,185,129,0.35)", borderWidth: 1, borderStyle: "solid" }} />
            <Chip label={`top node (filtered): ${derived.stats.topNode}`} size="small" sx={{ bgcolor: "rgba(244,63,94,0.15)", color: "#fff", borderColor: "rgba(244,63,94,0.35)", borderWidth: 1, borderStyle: "solid" }} />
          </Stack>
        </Box>

          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ ml: { md: "auto" } }}>
            <Button variant="contained" size="medium" onClick={loadFollowing} sx={{ backgroundColor: "#38bdf8" }}>
              Reload data
            </Button>
            <Chip
              label={`Source: ${sourceFilter}`}
              size="small"
              sx={{ bgcolor: "rgba(255,255,255,0.08)", color: "#fff", borderColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderStyle: "solid" }}
            />
            <Stack direction="row" spacing={0.5} alignItems="center">
              {(["all", "instagram", "fetlife"] as const).map((opt) => (
                <Button
                  key={opt}
                  variant={sourceFilter === opt ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setSourceFilter(opt)}
                  sx={{
                    textTransform: "none",
                    backgroundColor: sourceFilter === opt ? "#2563eb" : "transparent",
                    borderColor: "rgba(255,255,255,0.2)",
                    color: "#fff",
                  }}
                >
                  {opt}
                </Button>
              ))}
            </Stack>
            {loading && (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} sx={{ color: "#fff" }} />
                <Typography variant="body2" sx={{ color: "#fff" }}>
                  Loading…
                </Typography>
              </Stack>
            )}
          </Stack>
      </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={3}>
            <StatTile label="Filtered nodes (≥2 followers)" value={derived.stats.nodes} hint={`Raw total nodes: ${derived.stats.totalNodes}`} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatTile label="Filtered edges" value={derived.stats.edges} hint={`Raw total edges: ${derived.stats.totalEdges}`} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatTile label="Input files (raw)" value={derived.stats.filesIn} hint="data/following" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatTile label="Handles ≥2 followers" value={derived.stats.handles3Plus} hint={`Raw total handles: ${derived.stats.totalHandles}`} />
          </Grid>
        </Grid>

        <Paper variant="outlined" sx={{ p: 2, background: "#0f172a", borderColor: "rgba(255,255,255,0.08)", color: "#fff" }}>
          <Tabs value={tab} onChange={(_e, v) => setTab(v)} textColor="inherit" indicatorColor="primary" sx={{ mb: 2 }}>
            <Tab label="Leaderboard" value="leaderboard" sx={{ color: "#fff", "&.Mui-selected": { color: "#fff" } }} />
            <Tab label="Graph" value="graph" sx={{ color: "#fff", "&.Mui-selected": { color: "#fff" } }} />
            <Tab label="List followers/following" value="lookup" sx={{ color: "#fff", "&.Mui-selected": { color: "#fff" } }} />
            <Tab label="Mutual followers" value="mutual" sx={{ color: "#fff", "&.Mui-selected": { color: "#fff" } }} />
            <Tab label="Coverage" value="coverage" sx={{ color: "#fff", "&.Mui-selected": { color: "#fff" } }} />
            <Tab label="2nd degrees" value="second" sx={{ color: "#fff", "&.Mui-selected": { color: "#fff" } }} />
          </Tabs>

          {(() => {
            if (tab === "leaderboard") {
              return (
                <Stack spacing={2}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
                    <Typography variant="subtitle1" sx={{ color: "#fff" }}>
                      Leaderboard
                    </Typography>
                    <Tabs
                      value={leaderboardSort}
                      onChange={(_e, v) => setLeaderboardSort(v)}
                      textColor="inherit"
                      indicatorColor="primary"
                      sx={{ minHeight: "auto" }}
                    >
                      <Tab label="Sorted by Weight" value="weight" sx={{ color: "#fff", "&.Mui-selected": { color: "#fff" } }} />
                      <Tab label="Sorted by Followers" value="followers" sx={{ color: "#fff", "&.Mui-selected": { color: "#fff" } }} />
                      <Tab label="Sorted by Following" value="following" sx={{ color: "#fff", "&.Mui-selected": { color: "#fff" } }} />
                    </Tabs>
                  </Stack>
                  <Paper variant="outlined" sx={{ p: 2, background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)", color: "#fff" }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ color: "#fff" }}>
                        {leaderboardSort === "weight" ? "Sorted by weight" : leaderboardSort === "followers" ? "Sorted by followers" : "Sorted by following"} ·{" "}
                        {formatNumber(leaderboardList.length)} handles
                      </Typography>
                      <CopyButton handles={leaderboardList.map((n) => n.username)} />
                    </Stack>
                    <Stack spacing={1.25} divider={<Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />}>
                      {leaderboardList.map((n, idx) => (
                        <UserRow
                          key={n.username}
                          index={idx}
                          username={n.username}
                          derived={derived}
                          degreeLabel={degreeLabel}
                          handleColor={handleColor}
                          onSelect={handleSelectUser}
                        />
                      ))}
                    </Stack>
                  </Paper>
                </Stack>
              );
            }

            if (tab === "graph") {
              return (
                <Stack spacing={2}>
                  {graphNodes.length === 0 ? (
                    <Typography variant="body2" sx={{ color: "#fff" }}>
                      Load data to see the graph.
                    </Typography>
                  ) : (
                    <ForceGraph nodes={graphNodes} links={graphLinks} highlight={highlightHandles} onSelect={handleSelectUser} />
                  )}
                  <Typography variant="body2" sx={{ color: "#fff" }}>
                    Drag to explore. Scroll or pinch to zoom. Graph shows the top 100 nodes by weight.
                  </Typography>
                </Stack>
              );
            }

            if (tab === "lookup") {
              return (
                <Stack spacing={2}>
                  <Autocomplete
                    options={derived.options}
                    value={lookupValue}
                    onChange={(_e, v) => setLookupValue(v || "")}
                    onInputChange={(_e, v) => setLookupValue(v || "")}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Start typing a username"
                        size="small"
                        fullWidth
                        InputLabelProps={{ sx: { color: "rgba(255,255,255,0.8)" } }}
                        InputProps={{
                          ...params.InputProps,
                          sx: {
                            color: "#fff",
                            "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.25)" },
                            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.35)" },
                          },
                        }}
                      />
                    )}
                    sx={{ width: 360 }}
                  />
                  {lookupValue && (
                    <Box>
                      {(() => {
                    const node = nodes.find((n) => n.username === lookupValue.trim().replace(/^@+/, "").toLowerCase());
                    if (!node) {
                      return (
                        <Typography variant="body2" sx={{ color: "#fca5a5" }}>
                          Handle not found in the graph.
                        </Typography>
                      );
                    }
                    const followers = showRawLookup
                      ? derived.sortedFollowersRaw.get(node.username) || []
                      : derived.sortedFollowers.get(node.username) || [];
                    const following = showRawLookup
                      ? derived.sortedFollowingRaw.get(node.username) || []
                      : derived.sortedFollowingFiltered.get(node.username) || [];
                    const followerCount = derived.followerCountMap.get(node.username) ?? 0;
                    const followingCount = derived.followingCountMap.get(node.username) ?? 0;
                    const rawFollowerCount = derived.rawFollowerCountMap.get(node.username) ?? followerCount;
                    const rawFollowingCount = derived.rawFollowingCountMap.get(node.username) ?? followingCount;
                    return (
                          <Stack spacing={2}>
                            <Typography variant="body2" sx={{ color: "#fff" }}>
                              @{node.username} — {followerCount}/{rawFollowerCount} follower{rawFollowerCount === 1 ? "" : "s"} · {followingCount}/{rawFollowingCount} following (with ≥2 followers)
                            </Typography>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={showRawLookup}
                                  onChange={(_e, checked) => setShowRawLookup(checked)}
                                  color="primary"
                                />
                              }
                              label="Show raw nodes"
                              sx={{ color: "#fff" }}
                            />
                            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                              <Box flex={1} sx={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 1, p: 1, maxHeight: 300, overflowY: "auto" }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                  <Typography variant="subtitle2" sx={{ color: "#fff" }}>
                                    Followers {showRawLookup ? "(raw)" : "(filtered)"} ({followers.length})
                                  </Typography>
                                  <CopyButton handles={followers} />
                                </Stack>
                                <Stack spacing={0.5}>
                                  {followers.map((u, idx) => (
                                    <UserRow
                                      key={u}
                                      index={idx}
                                      username={u}
                                      derived={derived}
                                      degreeLabel={showRawLookup ? degreeLabelRaw : degreeLabel}
                                      handleColor={handleColor}
                                      onSelect={handleSelectUser}
                                      countsMode={showRawLookup ? "raw" : "filtered"}
                                    />
                                  ))}
                                </Stack>
                              </Box>
                              <Box flex={1} sx={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 1, p: 1, maxHeight: 300, overflowY: "auto" }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                  <Typography variant="subtitle2" sx={{ color: "#fff" }}>
                                    {showRawLookup
                                      ? `Following (raw) (${following.length})`
                                      : `Following (filtered) (${following.length}) — filtered to handles with ≥2 followers`}
                                  </Typography>
                                  <CopyButton handles={following} />
                                </Stack>
                                <Stack spacing={0.5}>
                                  {following.map((u, idx) => (
                                    <UserRow
                                      key={u}
                                      index={idx}
                                      username={u}
                                      derived={derived}
                                      degreeLabel={showRawLookup ? degreeLabelRaw : degreeLabel}
                                      handleColor={handleColor}
                                      onSelect={handleSelectUser}
                                      countsMode={showRawLookup ? "raw" : "filtered"}
                                    />
                                  ))}
                                </Stack>
                              </Box>
                            </Stack>
                          </Stack>
                        );
                      })()}
                    </Box>
                  )}
                </Stack>
              );
            }

            if (tab === "coverage") {
              const followingSlice = derived.followingUsers.slice(0, COVERAGE_LIMIT);
              const followerOnlySlice = derived.followerOnly.slice(0, COVERAGE_LIMIT);
              return (
                <Stack spacing={2}>
                  <Typography variant="body2" sx={{ color: "#fff" }}>
                    Accounts with outgoing follows (left) and top accounts with zero outgoing follows (right). Click to drill into a handle.
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {derived.followingUsers.length > COVERAGE_LIMIT && (
                      <Chip
                        size="small"
                        label={`Showing top ${COVERAGE_LIMIT} of ${formatNumber(derived.followingUsers.length)} with following`}
                        sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.1)" }}
                      />
                    )}
                    {derived.followerOnly.length > COVERAGE_LIMIT && (
                      <Chip
                        size="small"
                        label={`Showing top ${COVERAGE_LIMIT} of ${formatNumber(derived.followerOnly.length)} with no following`}
                        sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.1)" }}
                      />
                    )}
                  </Stack>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <Paper variant="outlined" sx={{ p: 2, flex: 1, background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)", color: "#fff" }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Has following list ({formatNumber(derived.followingUsers.length)})
                      </Typography>
                      <Stack spacing={0.5} sx={{ maxHeight: 360, overflowY: "auto" }}>
                        {followingSlice.map((n, idx) => (
                          <UserRow
                            key={n.username}
                            index={idx}
                            username={n.username}
                            derived={derived}
                            degreeLabel={degreeLabel}
                            handleColor={handleColor}
                            onSelect={handleSelectUser}
                          />
                        ))}
                      </Stack>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 2, flex: 1, background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)", color: "#fff" }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Top followers with no following
                      </Typography>
                      <Stack spacing={0.5} sx={{ maxHeight: 360, overflowY: "auto" }}>
                        {followerOnlySlice.map((n, idx) => (
                          <UserRow
                            key={n.username}
                            index={idx}
                            username={n.username}
                            derived={derived}
                            degreeLabel={degreeLabel}
                            handleColor={handleColor}
                            onSelect={handleSelectUser}
                          />
                        ))}
                      </Stack>
                    </Paper>
                  </Stack>
                </Stack>
              );
            }

            if (tab === "second") {
              return (
                <SecondDegreesTab
                  derived={derived}
                  degreeLabel={degreeLabel}
                  handleColor={handleColor}
                  onSelect={handleSelectUser}
                />
              );
            }

            return (
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
                  <Autocomplete
                    options={nodes.map((n) => n.username)}
                    value={mutualA}
                    onChange={(_e, v) => setMutualA(v || "")}
                    onInputChange={(_e, v) => setMutualA(v || "")}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="User A"
                        size="small"
                        fullWidth
                        InputLabelProps={{ sx: { color: "rgba(255,255,255,0.8)" } }}
                        InputProps={{
                          ...params.InputProps,
                          sx: {
                            color: "#fff",
                            "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.25)" },
                            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.35)" },
                          },
                        }}
                      />
                    )}
                    sx={{ width: 320 }}
                  />
                  <Autocomplete
                    options={nodes.map((n) => n.username)}
                    value={mutualB}
                    onChange={(_e, v) => setMutualB(v || "")}
                    onInputChange={(_e, v) => setMutualB(v || "")}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="User B"
                        size="small"
                        fullWidth
                        InputLabelProps={{ sx: { color: "rgba(255,255,255,0.8)" } }}
                        InputProps={{
                          ...params.InputProps,
                          sx: {
                            color: "#fff",
                            "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.25)" },
                            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.35)" },
                          },
                        }}
                      />
                    )}
                    sx={{ width: 320 }}
                  />
                </Stack>
                {mutualA && mutualB ? (
                  (() => {
                    const norm = (s: string) => s.trim().replace(/^@+/, "").toLowerCase();
                    const a = norm(mutualA);
                    const b = norm(mutualB);
                    const nodeA = nodes.find((n) => n.username === a);
                    const nodeB = nodes.find((n) => n.username === b);
                    if (!nodeA || !nodeB) {
                      return (
                        <Typography variant="body2" sx={{ color: "#fca5a5" }}>
                          One or both users not found in the graph.
                        </Typography>
                      );
                    }
                    const followersA = new Set(nodeA.followers);
                    const followingA = new Set(nodeA.following);
                    const mutualFollowers = (derived.sortedFollowers.get(nodeB.username) || []).filter((u) => followersA.has(u));
                    const mutualFollowing = (derived.sortedFollowingFiltered.get(nodeB.username) || []).filter((u) => followingA.has(u));
                    const mutualCombined = Array.from(new Set([...mutualFollowers, ...mutualFollowing]));
                    return (
                      <Stack spacing={2}>
                        <Stack spacing={1}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant="body2" sx={{ color: "#fff" }}>
                              Mutual (followers OR following): {mutualCombined.length}
                            </Typography>
                            <CopyButton handles={mutualCombined} />
                          </Stack>
                          {mutualCombined.length > 0 && (
                            <Box sx={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 1, p: 1, maxHeight: 240, overflowY: "auto" }}>
                              <Stack spacing={0.5}>
                                {mutualCombined.map((u, idx) => (
                                  <UserRow
                                    key={u}
                                    index={idx}
                                    username={u}
                                    derived={derived}
                                    degreeLabel={degreeLabel}
                                    handleColor={handleColor}
                                    onSelect={handleSelectUser}
                                  />
                                ))}
                              </Stack>
                            </Box>
                          )}
                        </Stack>
                        <Stack spacing={1}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant="body2" sx={{ color: "#fff" }}>
                              Mutual followers of @{a} and @{b}: {mutualFollowers.length}
                            </Typography>
                            <CopyButton handles={mutualFollowers} />
                          </Stack>
                          {mutualFollowers.length > 0 && (
                            <Box sx={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 1, p: 1, maxHeight: 240, overflowY: "auto" }}>
                              <Stack spacing={0.5}>
                                {mutualFollowers.map((u, idx) => (
                                  <UserRow
                                    key={u}
                                    index={idx}
                                    username={u}
                                    derived={derived}
                                    degreeLabel={degreeLabel}
                                    handleColor={handleColor}
                                    onSelect={handleSelectUser}
                                  />
                                ))}
                              </Stack>
                            </Box>
                          )}
                        </Stack>
                        <Stack spacing={1}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant="body2" sx={{ color: "#fff" }}>
                              Mutual following (accounts both follow): {mutualFollowing.length}
                            </Typography>
                            <CopyButton handles={mutualFollowing} />
                          </Stack>
                          {mutualFollowing.length > 0 && (
                            <Box sx={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 1, p: 1, maxHeight: 240, overflowY: "auto" }}>
                              <Stack spacing={0.5}>
                                {mutualFollowing.map((u, idx) => (
                                  <UserRow
                                    key={u}
                                    index={idx}
                                    username={u}
                                    derived={derived}
                                    degreeLabel={degreeLabel}
                                    handleColor={handleColor}
                                    onSelect={handleSelectUser}
                                  />
                                ))}
                              </Stack>
                            </Box>
                          )}
                        </Stack>
                      </Stack>
                    );
                  })()
                ) : (
                  <Typography variant="body2" sx={{ color: "#fff" }}>
                    Pick both users to see mutual followers.
                  </Typography>
                )}
              </Stack>
            );
          })()}
        </Paper>
        </Stack>
      </Paper>
    </>
  );
};

export default InstagramModule;
