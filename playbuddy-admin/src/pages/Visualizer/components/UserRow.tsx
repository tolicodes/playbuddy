import React from "react";
import { Avatar, Button, Chip, Stack, Typography } from "@mui/material";
import { DerivedData } from "../instagramTypes";

type Props = {
  index: number;
  username: string;
  derived: DerivedData;
  degreeLabel: (u: string) => string;
  handleColor: (u: string) => string;
  onSelect: (u: string) => void;
  countsMode?: "filtered" | "raw";
};

const UserRow: React.FC<Props> = ({ index, username, derived, degreeLabel, handleColor, onSelect, countsMode = "filtered" }) => {
  const node = derived.nodeMap.get(username) ?? derived.rawNodeMap.get(username);
  const useRaw = countsMode === "raw";
  const followersCount = useRaw
    ? derived.rawFollowerCountMap.get(username) ?? derived.followerCountMap.get(username) ?? 0
    : derived.filteredCountMap.get(username)?.followers ??
      derived.followerCountMap.get(username) ??
      node?.followersCount ??
      0;
  const followingCount = useRaw
    ? derived.rawFollowingCountMap.get(username) ?? derived.followingCountMap.get(username) ?? 0
    : derived.filteredCountMap.get(username)?.following ??
      derived.followingCountMap.get(username) ??
      node?.followingCount ??
      0;
  const weight = useRaw ? followersCount * 5 + followingCount : node?.weight ?? 0;
  const showInsta = node?.source !== "fetlife";
  const profilePicUrl = node?.profilePicUrl;
  const fullName = node?.fullName;
  const fetlifeUrl = `https://fetlife.com/${username}`;
  const instaUrl = `https://instagram.com/${username}`;

  return (
    <Stack key={username} direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ py: 0.35 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" flex={1} minWidth={0}>
        <Typography variant="body2" sx={{ width: 28, color: "rgba(148,163,184,0.9)", fontVariantNumeric: "tabular-nums" }}>
          #{index + 1}
        </Typography>
        <Avatar src={profilePicUrl} alt={username} sx={{ width: 40, height: 40, bgcolor: "rgba(148,163,184,0.2)" }}>
          {username.charAt(0).toUpperCase()}
        </Avatar>
        <Stack spacing={0.4} minWidth={0}>
          <Typography
            variant="body1"
            sx={{ color: handleColor(username), cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            onClick={() => onSelect(username)}
          >
            @{username}
          </Typography>
          {fullName && (
            <Typography variant="caption" sx={{ color: "rgba(226,232,240,0.7)" }}>
              {fullName}
            </Typography>
          )}
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
            <Chip
              size="small"
              label={`${followersCount.toLocaleString()} followers`}
              sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.08)", cursor: "pointer" }}
              onClick={() => onSelect(username)}
            />
            <Chip
              size="small"
              label={`${followingCount.toLocaleString()} following`}
              sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.08)", cursor: "pointer" }}
              onClick={() => onSelect(username)}
            />
            <Chip
              size="small"
              label={`w=${Math.round(weight).toLocaleString()}`}
              sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.12)" }}
            />
          </Stack>
        </Stack>
      </Stack>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Typography variant="caption" sx={{ color: "rgba(226,232,240,0.9)", fontWeight: 600 }}>
          {degreeLabel(username)}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          href={fetlifeUrl}
          target="_blank"
          rel="noreferrer"
          sx={{ color: "#93c5fd", borderColor: "rgba(147,197,253,0.4)", textTransform: "none" }}
        >
          Fetlife
        </Button>
        {showInsta && (
          <Button
            variant="outlined"
            size="small"
            href={instaUrl}
            target="_blank"
            rel="noreferrer"
            sx={{ color: "#93c5fd", borderColor: "rgba(147,197,253,0.4)", textTransform: "none" }}
          >
            Insta
          </Button>
        )}
      </Stack>
    </Stack>
  );
};

export default UserRow;
