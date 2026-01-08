import React from "react";
import { Autocomplete, Box, Stack, TextField, Typography } from "@mui/material";
import { DerivedData, GraphNode } from "../instagramTypes";
import CopyButton from "../components/CopyButton";
import UserRow from "../components/UserRow";

type Props = {
  nodes: GraphNode[];
  derived: DerivedData;
  mutualA: string;
  mutualB: string;
  setMutualA: (v: string) => void;
  setMutualB: (v: string) => void;
  handleColor: (u: string) => string;
  degreeLabel: (u: string) => string;
  onSelect: (u: string) => void;
};

const MutualTab: React.FC<Props> = ({ nodes, derived, mutualA, mutualB, setMutualA, setMutualB, handleColor, degreeLabel, onSelect }) => (
  <Stack spacing={2}>
    <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
      <Autocomplete
        options={derived.options}
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
        options={derived.options}
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
                        onSelect={onSelect}
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
                        onSelect={onSelect}
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
                        onSelect={onSelect}
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

export default MutualTab;
