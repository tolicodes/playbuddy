import React from "react";
import { Autocomplete, Box, Stack, TextField, Typography } from "@mui/material";
import { DerivedData, GraphNode } from "../instagramTypes";
import CopyButton from "../components/CopyButton";
import UserRow from "../components/UserRow";

type Props = {
  nodes: GraphNode[];
  derived: DerivedData;
  lookupValue: string;
  setLookupValue: (v: string) => void;
  handleColor: (u: string) => string;
  degreeLabel: (u: string) => string;
  onSelect: (u: string) => void;
};

const LookupTab: React.FC<Props> = ({ nodes, derived, lookupValue, setLookupValue, handleColor, degreeLabel, onSelect }) => (
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
          const followers = derived.sortedFollowers.get(node.username) || [];
          const following = derived.sortedFollowingFiltered.get(node.username) || [];
          const followerCount = derived.followerCountMap.get(node.username) ?? 0;
          const followingCount = derived.followingCountMap.get(node.username) ?? 0;
          const rawFollowerCount = derived.rawFollowerCountMap.get(node.username) ?? followerCount;
          const rawFollowingCount = derived.rawFollowingCountMap.get(node.username) ?? followingCount;
          return (
            <Stack spacing={2}>
              <Typography variant="body2" sx={{ color: "#fff" }}>
                @{node.username} — {followerCount}/{rawFollowerCount} follower{rawFollowerCount === 1 ? "" : "s"} · {followingCount}/{rawFollowingCount} following (with ≥2 followers)
              </Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <Box flex={1} sx={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 1, p: 1, maxHeight: 300, overflowY: "auto" }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ color: "#fff" }}>
                      Followers ({followerCount})
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
                        degreeLabel={degreeLabel}
                        handleColor={handleColor}
                        onSelect={onSelect}
                      />
                    ))}
                  </Stack>
                </Box>
                <Box flex={1} sx={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 1, p: 1, maxHeight: 300, overflowY: "auto" }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ color: "#fff" }}>
                      Following ({followingCount}) — filtered to handles with ≥2 followers
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
                        degreeLabel={degreeLabel}
                        handleColor={handleColor}
                        onSelect={onSelect}
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

export default LookupTab;
