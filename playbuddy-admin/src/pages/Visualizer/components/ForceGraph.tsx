import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Box } from "@mui/material";
import { GraphLink, GraphNode } from "../instagramTypes";

type Props = {
  nodes: GraphNode[];
  links: GraphLink[];
  highlight?: Set<string>;
  onSelect?: (u: string) => void;
};

const ForceGraph: React.FC<Props> = ({ nodes, links, highlight, onSelect }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth || 960;
    const height = 600;

    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`).attr("preserveAspectRatio", "xMidYMid meet");

    const simNodes = nodes.map((n) => ({ ...n }));
    const simLinks = links.map((l) => ({ ...l }));

    const weights = simNodes.map((n) => Math.max(n.weight || 0, 0));
    const maxWeight = d3.max(weights) || 1;
    const sortedWeights = [...weights].sort((a, b) => a - b);
    const percentileIndex = Math.floor((sortedWeights.length - 1) * 0.95);
    const maxWeightP95 = sortedWeights[percentileIndex] ?? maxWeight;
    const minWeight = d3.min(weights) ?? 0;
    const logMin = Math.log1p(minWeight);
    const logMax = Math.log1p(maxWeightP95);
    const logDenom = logMax - logMin;
    const radiusMin = 6;
    const radiusMax = 28;
    const alpha = 0.35;

    const radiusForWeight = (weight: number) => {
      const safeWeight = Math.max(weight || 0, 0);
      if (logDenom <= 0) return (radiusMin + radiusMax) / 2;
      const t = (Math.log1p(safeWeight) - logMin) / logDenom;
      const clamped = Math.min(1, Math.max(0, t));
      const t2 = Math.pow(clamped, alpha);
      return radiusMin + (radiusMax - radiusMin) * t2;
    };

    const colorScale = d3.scaleSequential(d3.interpolateCool).domain([maxWeight, 0]);

    const container = svg.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.35, 4])
      .on("zoom", (event) => container.attr("transform", event.transform.toString()));
    svg.call(zoom as any);

    const link = container
      .append("g")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-opacity", 0.2)
      .selectAll("line")
      .data(simLinks)
      .enter()
      .append("line")
      .attr("stroke-width", 0.9);

    const node = container
      .append("g")
      .selectAll("circle")
      .data(simNodes)
      .enter()
      .append("circle")
      .attr("r", (d: any) => radiusForWeight(d.weight))
      .attr("fill", (d: any) => (highlight?.has(d.username) ? "#fbbf24" : colorScale(d.weight)))
      .attr("stroke", (d: any) => (highlight?.has(d.username) ? "#f59e0b" : "#0f172a"))
      .attr("stroke-width", (d: any) => (highlight?.has(d.username) ? 2 : 1.2))
      .style("cursor", onSelect ? "pointer" : "default")
      .on("mouseenter", (event: any, d: any) => {
        setTooltip({
          x: event.offsetX + 12,
          y: event.offsetY + 12,
          text: `@${d.username} — ${d.followersCount ?? 0} followers · ${d.followingCount ?? 0} following · w=${d.weight.toFixed(2)}`,
        });
      })
      .on("mousemove", (event: any, d: any) => {
        setTooltip({
          x: event.offsetX + 12,
          y: event.offsetY + 12,
          text: `@${d.username} — ${d.followersCount ?? 0} followers · ${d.followingCount ?? 0} following · w=${d.weight.toFixed(2)}`,
        });
      })
      .on("mouseleave", () => setTooltip(null))
      .on("click", (_event: any, d: any) => onSelect?.(d.username));

    const simulation = d3
      .forceSimulation(simNodes as any)
      .force(
        "link",
        d3
          .forceLink(simLinks as any)
          .id((d: any) => d.username)
          .distance(80)
          .strength(0.35)
      )
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => radiusForWeight(d.weight) + 10))
      .alphaDecay(0.08);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x || 0)
        .attr("y1", (d: any) => d.source.y || 0)
        .attr("x2", (d: any) => d.target.x || 0)
        .attr("y2", (d: any) => d.target.y || 0);

      node.attr("cx", (d: any) => d.x || width / 2).attr("cy", (d: any) => d.y || height / 2);
    });

    return () => {
      simulation.stop();
      svg.selectAll("*").remove();
    };
  }, [nodes, links, highlight, onSelect]);

  return (
    <Box sx={{ position: "relative", background: "#0b1224", borderRadius: 2, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 18% 22%, rgba(56,189,248,0.16), transparent 30%), radial-gradient(circle at 78% 12%, rgba(147,51,234,0.12), transparent 28%)",
          pointerEvents: "none",
        }}
      />
      <svg ref={svgRef} width="100%" height={600} />
      {tooltip && (
        <Box
          sx={{
            position: "absolute",
            left: tooltip.x,
            top: tooltip.y,
            background: "rgba(15, 23, 42, 0.9)",
            color: "#fff",
            px: 1,
            py: 0.5,
            borderRadius: 1,
            fontSize: 12,
            pointerEvents: "none",
            boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
            transform: "translate(-40%, -130%)",
            maxWidth: 260,
          }}
        >
          {tooltip.text}
        </Box>
      )}
    </Box>
  );
};

export default ForceGraph;
