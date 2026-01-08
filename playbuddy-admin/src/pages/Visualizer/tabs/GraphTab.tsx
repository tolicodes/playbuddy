import React from "react";
import { Stack, Typography } from "@mui/material";
import { GraphLink, GraphNode } from "../instagramTypes";
import ForceGraph from "../components/ForceGraph";

type Props = {
  nodes: GraphNode[];
  links: GraphLink[];
  highlight: Set<string>;
  onSelect: (u: string) => void;
};

const GraphTab: React.FC<Props> = ({ nodes, links, highlight, onSelect }) => (
  <Stack spacing={2}>
    {nodes.length === 0 ? (
      <Typography variant="body2" sx={{ color: "#fff" }}>
        Load data to see the graph.
      </Typography>
    ) : (
      <ForceGraph nodes={nodes} links={links} highlight={highlight} onSelect={onSelect} />
    )}
    <Typography variant="body2" sx={{ color: "#fff" }}>
      Drag to explore. Scroll or pinch to zoom. Node size is based on follower count; edges are directed follow relationships.
    </Typography>
  </Stack>
);

export default GraphTab;
