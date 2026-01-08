import React from "react";
import { Paper, Stack, Typography } from "@mui/material";
import { DerivedData } from "../instagramTypes";
import UserRow from "../components/UserRow";
import CopyButton from "../components/CopyButton";

type Props = {
  derived: DerivedData;
  degreeLabel: (u: string) => string;
  handleColor: (u: string) => string;
  onSelect: (u: string) => void;
};

const SecondDegreesTab: React.FC<Props> = ({ derived, degreeLabel, handleColor, onSelect }) => {
  const limit = 500;
  const sliced = derived.secondDegree.slice(0, limit);
  return (
    <Paper variant="outlined" sx={{ p: 2, background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)", color: "#fff" }}>
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1">2nd degree handles</Typography>
          <CopyButton handles={derived.secondDegree.map((n) => n.username)} />
        </Stack>
        {derived.secondDegree.length > limit && (
          <Typography variant="body2" sx={{ color: "#fff" }}>
            Showing top {limit} of {derived.secondDegree.length} by followers
          </Typography>
        )}
        <Stack spacing={0.5} sx={{ maxHeight: 480, overflowY: "auto" }}>
          {sliced.map((n, idx) => (
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
      </Stack>
    </Paper>
  );
};

export default SecondDegreesTab;
