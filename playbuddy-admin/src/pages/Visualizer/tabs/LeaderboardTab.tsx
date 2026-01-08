import React from "react";
import { Divider, Paper, Stack, Typography } from "@mui/material";
import { DerivedData } from "../instagramTypes";
import UserRow from "../components/UserRow";
import CopyButton from "../components/CopyButton";

type Props = {
  derived: DerivedData;
  handleColor: (u: string) => string;
  degreeLabel: (u: string) => string;
  onSelect: (u: string) => void;
};

const LeaderboardTab: React.FC<Props> = ({ derived, handleColor, degreeLabel, onSelect }) => {
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
        <Paper variant="outlined" sx={{ p: 2, flex: 1, background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)", color: "#fff" }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Weighted leaders (followers only)
          </Typography>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="body2" sx={{ color: "#fff" }}>Top {derived.topWeight.length}</Typography>
            <CopyButton handles={derived.topWeight.map((n) => n.username)} />
          </Stack>
          <Stack spacing={1.25} divider={<Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />}>
            {derived.topWeight.map((n, idx) => (
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

        <Stack spacing={2} width={{ xs: "100%", lg: 320 }}>
          <Paper variant="outlined" sx={{ p: 2, background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)", color: "#fff" }}>
            <Typography variant="subtitle2" gutterBottom>
              Top by following
            </Typography>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <span />
              <CopyButton handles={derived.topFollowing.map((n) => n.username)} />
            </Stack>
            <Stack spacing={0.5}>
              {derived.topFollowing.map((n, idx) => (
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
    </Stack>
  );
};

export default LeaderboardTab;
