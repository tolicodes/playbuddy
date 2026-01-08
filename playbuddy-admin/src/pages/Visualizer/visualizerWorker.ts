/// <reference lib="webworker" />
import type { GraphLink, GraphNode, DerivedData } from "./instagramTypes";
import { buildVisualizerData, SourceFilter } from "./deriveGraph";

type ComputeRequest = {
  id: number;
  rawNodes: any[];
  rawLinks: any[];
  sourceFilter: SourceFilter;
  anchorHandle: string;
  buckets?: Record<string, string[]>;
};

type ComputeResponse = {
  id: number;
  nodes?: GraphNode[];
  links?: GraphLink[];
  graphNodes?: GraphNode[];
  graphLinks?: GraphLink[];
  derived?: DerivedData;
  error?: string;
};

const ctx: DedicatedWorkerGlobalScope = globalThis as any;

ctx.onmessage = (event: MessageEvent<ComputeRequest>) => {
  const { id, rawNodes, rawLinks, sourceFilter, anchorHandle, buckets } = event.data || ({} as ComputeRequest);
  try {
    const { nodes, links, graphNodes, graphLinks, derived } = buildVisualizerData(rawNodes || [], rawLinks || [], sourceFilter || "all", anchorHandle || "", buckets);
    const payload: ComputeResponse = { id, nodes, links, graphNodes, graphLinks, derived };
    ctx.postMessage(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to compute visualizer data";
    const payload: ComputeResponse = { id, error: message };
    ctx.postMessage(payload);
  }
};

export {};
