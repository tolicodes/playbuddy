import React from "react";
import { Chip, Paper, Stack, Typography } from "@mui/material";
import { DerivedData } from "../instagramTypes";
import UserRow from "../components/UserRow";
import CopyButton from "../components/CopyButton";

type Props = {
  derived: DerivedData;
  coverageLimit: number;
  degreeLabel: (u: string) => string;
  handleColor: (u: string) => string;
  onSelect: (u: string) => void;
};

const CoverageTab: React.FC<Props> = ({ derived, coverageLimit, degreeLabel, handleColor, onSelect }) => {
  const followingSlice = derived.followingUsers.slice(0, coverageLimit);
  const followerOnlySlice = derived.followerOnly.slice(0, coverageLimit);

  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: "#fff" }}>
        Accounts with outgoing follows (left) and top accounts with zero outgoing follows (right). Click to drill into a handle.
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {derived.followingUsers.length > coverageLimit && (
          <Chip
            size="small"
            label={`Showing top ${coverageLimit} of ${derived.stats.nodes} with following`}
            sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.1)" }}
          />
        )}
        {derived.followerOnly.length > coverageLimit && (
          <Chip
            size="small"
            label={`Showing top ${coverageLimit} of ${derived.stats.nodes} with no following`}
            sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.1)" }}
          />
        )}
      </Stack>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Paper variant="outlined" sx={{ p: 2, flex: 1, background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)", color: "#fff" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2" gutterBottom>
              Has following list ({derived.followingUsers.length})
            </Typography>
            <CopyButton handles={derived.followingUsers.map((n) => n.username)} />
          </Stack>
          <Stack spacing={0.5} sx={{ maxHeight: 360, overflowY: "auto" }}>
            {followingSlice.map((n, idx) => (
              <UserRow
                key={n.username}
                index={idx}
                username={n.username}
                derived={derived}
                degreeLabel={degreeLabel}
                handleColor={handleColor}
                onSelect={onSelect}
              />
            ))}
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, flex: 1, background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)", color: "#fff" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2" gutterBottom>
              Top followers with no following
            </Typography>
            <CopyButton handles={derived.followerOnly.map((n) => n.username)} />
          </Stack>
          <Stack spacing={0.5} sx={{ maxHeight: 360, overflowY: "auto" }}>
            {followerOnlySlice.map((n, idx) => (
              <UserRow
                key={n.username}
                index={idx}
                username={n.username}
                derived={derived}
                degreeLabel={degreeLabel}
                handleColor={handleColor}
                onSelect={onSelect}
              />
            ))}
          </Stack>
        </Paper>
      </Stack>
    </Stack>
  );
};

export default CoverageTab;
