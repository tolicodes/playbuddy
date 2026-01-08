import type { DerivedData, GraphLink, GraphNode } from "./instagramTypes";

const normalizeUsername = (u?: string) => (u || "").trim().replace(/^@+/, "").toLowerCase();
const formatNumber = (n: number) => n.toLocaleString();
const MIN_FOLLOWERS = 2;
const GRAPH_NODE_LIMIT = 100;
const LEADERBOARD_LIMIT = 100;

export type SourceFilter = "all" | "instagram" | "fetlife";

type Totals = {
  totalNodes: number;
  totalEdges: number;
  totalHandles: number;
};

type LinkStats = {
  followerCountMap: Map<string, number>;
  followingCountMap: Map<string, number>;
  followersSetMap: Map<string, Set<string>>;
  followingSetMap: Map<string, Set<string>>;
};

const isSameSet = (a: Set<string>, b: Set<string>) => {
  if (a.size !== b.size) return false;
  for (const entry of Array.from(a)) {
    if (!b.has(entry)) return false;
  }
  return true;
};

const buildEligibleSet = (nodes: GraphNode[], stats: LinkStats) => {
  const eligible = new Set<string>();
  for (const n of nodes) {
    const count = stats.followerCountMap.get(n.username) ?? 0;
    if (count >= MIN_FOLLOWERS) eligible.add(n.username);
  }
  return eligible;
};

const filterLinksByEligible = (links: GraphLink[], eligible: Set<string>) => {
  const filtered: GraphLink[] = [];
  for (const link of links) {
    if (eligible.has(link.source) && eligible.has(link.target)) {
      filtered.push(link);
    }
  }
  return filtered;
};

const filterNodesByEligible = (nodes: GraphNode[], eligible: Set<string>) => {
  const filtered: GraphNode[] = [];
  for (const node of nodes) {
    if (eligible.has(node.username)) {
      filtered.push(node);
    }
  }
  return filtered;
};

const buildLinkStats = (links: GraphLink[]): LinkStats => {
  const followerCountMap = new Map<string, number>();
  const followingCountMap = new Map<string, number>();
  const followersSetMap = new Map<string, Set<string>>();
  const followingSetMap = new Map<string, Set<string>>();

  links.forEach((l) => {
    followerCountMap.set(l.target, (followerCountMap.get(l.target) ?? 0) + 1);
    followingCountMap.set(l.source, (followingCountMap.get(l.source) ?? 0) + 1);

    const followerSet = followersSetMap.get(l.target) ?? new Set<string>();
    followerSet.add(l.source);
    followersSetMap.set(l.target, followerSet);

    const followingSet = followingSetMap.get(l.source) ?? new Set<string>();
    followingSet.add(l.target);
    followingSetMap.set(l.source, followingSet);
  });

  return { followerCountMap, followingCountMap, followersSetMap, followingSetMap };
};

const mapGraphData = (rawNodes: any[], rawLinks: any[]) => {
  const nodeMap = new Map<string, GraphNode>();
  rawNodes.forEach((n: any) => {
    const username = normalizeUsername(n?.username);
    if (!username) return;
    const existing = nodeMap.get(username);
    const source = n?.source === "fetlife" ? "fetlife" : "instagram";
    if (!existing) {
      nodeMap.set(username, {
        username,
        followers: [],
        following: [],
        fullName: n?.fullName,
        profilePicUrl: n?.profilePicUrl,
        source,
        weight: 0,
      });
      return;
    }
    if (!existing.fullName && typeof n?.fullName === "string") existing.fullName = n.fullName;
    if (!existing.profilePicUrl && typeof n?.profilePicUrl === "string") existing.profilePicUrl = n.profilePicUrl;
    if (!existing.source && source) existing.source = source;
  });

  const mappedLinks: GraphLink[] = rawLinks
    .map((l: any) => {
      const s = typeof l.source === "string" ? normalizeUsername(l.source) : "";
      const t = typeof l.target === "string" ? normalizeUsername(l.target) : "";
      return s && t ? { source: s, target: t } : null;
    })
    .filter(Boolean) as GraphLink[];

  return { mappedNodes: Array.from(nodeMap.values()), mappedLinks };
};

const filterGraphBySource = (
  mappedNodes: GraphNode[],
  mappedLinks: GraphLink[],
  sourceFilter: SourceFilter
) => {
  if (sourceFilter === "all") {
    return { filteredNodes: mappedNodes, filteredLinks: mappedLinks };
  }
  const allowed = new Set(mappedNodes.filter((n) => n.source === sourceFilter).map((n) => n.username));
  const filteredNodes = mappedNodes.filter((n) => allowed.has(n.username));
  const filteredLinks = mappedLinks.filter((l) => allowed.has(l.source) && allowed.has(l.target));
  return { filteredNodes, filteredLinks };
};

const buildNodesWithLists = (
  nodes: GraphNode[],
  stats: LinkStats
): GraphNode[] => {
  return nodes.map((n) => {
    const followers = Array.from(stats.followersSetMap.get(n.username) ?? []).sort();
    const following = Array.from(stats.followingSetMap.get(n.username) ?? []).sort();
    const followersCount = stats.followerCountMap.get(n.username) ?? 0;
    const followingCount = stats.followingCountMap.get(n.username) ?? 0;
    return {
      ...n,
      followers,
      following,
      followersCount,
      followingCount,
      weight: followersCount * 5 + followingCount,
    };
  });
};

export const computeDerived = (
  mappedNodes: GraphNode[],
  mappedLinks: GraphLink[],
  anchorHandle: string,
  buckets?: Record<string, string[]>,
  totals?: Totals,
  rawStats?: LinkStats,
  rawNodeMapInput?: Map<string, GraphNode>
): DerivedData => {
  const nodeMap = new Map<string, GraphNode>();
  mappedNodes.forEach((n) => nodeMap.set(n.username, n));
  const rawNodeMap = rawNodeMapInput ?? nodeMap;

  const followerCountMap = new Map<string, number>();
  const followingCountMap = new Map<string, number>();
  mappedLinks.forEach((l) => {
    followerCountMap.set(l.target, (followerCountMap.get(l.target) ?? 0) + 1);
    followingCountMap.set(l.source, (followingCountMap.get(l.source) ?? 0) + 1);
  });
  mappedNodes.forEach((n) => {
    if (!followerCountMap.has(n.username)) {
      followerCountMap.set(n.username, n.followersCount ?? 0);
    }
    if (!followingCountMap.has(n.username)) {
      followingCountMap.set(n.username, n.followingCount ?? 0);
    }
  });

  const rawFollowerCountMap = new Map<string, number>(rawStats?.followerCountMap ?? []);
  const rawFollowingCountMap = new Map<string, number>(rawStats?.followingCountMap ?? []);
  mappedNodes.forEach((n) => {
    if (!rawFollowerCountMap.has(n.username)) {
      rawFollowerCountMap.set(n.username, followerCountMap.get(n.username) ?? 0);
    }
    if (!rawFollowingCountMap.has(n.username)) {
      rawFollowingCountMap.set(n.username, followingCountMap.get(n.username) ?? 0);
    }
  });

  const filteredCountMap = new Map<string, { followers: number; following: number }>();
  mappedNodes.forEach((n) => {
    filteredCountMap.set(n.username, {
      followers: followerCountMap.get(n.username) ?? 0,
      following: followingCountMap.get(n.username) ?? 0,
    });
  });

  const compareFollowers = (a: string, b: string) => {
    const fa = followerCountMap.get(a) ?? 0;
    const fb = followerCountMap.get(b) ?? 0;
    return fb - fa || a.localeCompare(b);
  };

  const sortedFollowers = new Map<string, string[]>();
  const sortedFollowingFiltered = new Map<string, string[]>();
  const sortedFollowersRaw = new Map<string, string[]>();
  const sortedFollowingRaw = new Map<string, string[]>();
  mappedNodes.forEach((n) => {
    const followers = Array.from(new Set(n.followers.map(normalizeUsername).filter(Boolean))).sort(compareFollowers);
    sortedFollowers.set(n.username, followers);
    const following = Array.from(new Set(n.following.map(normalizeUsername).filter(Boolean))).sort(compareFollowers);
    sortedFollowingFiltered.set(n.username, following);

    const rawFollowers = Array.from(rawStats?.followersSetMap.get(n.username) ?? n.followers)
      .map(normalizeUsername)
      .filter(Boolean)
      .sort((a, b) => {
        const fa = rawFollowerCountMap.get(a) ?? 0;
        const fb = rawFollowerCountMap.get(b) ?? 0;
        return fb - fa || a.localeCompare(b);
      });
    sortedFollowersRaw.set(n.username, rawFollowers);

    const rawFollowing = Array.from(rawStats?.followingSetMap.get(n.username) ?? n.following)
      .map(normalizeUsername)
      .filter(Boolean)
      .sort((a, b) => {
        const fa = rawFollowerCountMap.get(a) ?? 0;
        const fb = rawFollowerCountMap.get(b) ?? 0;
        return fb - fa || a.localeCompare(b);
      });
    sortedFollowingRaw.set(n.username, rawFollowing);
  });

  const anchorNode = mappedNodes.find((n) => n.username === anchorHandle);
  const anchorFollowingSet = new Set<string>(anchorNode?.following || []);

  const sortedByFollowers = [...mappedNodes].sort((a, b) => {
    const fa = followerCountMap.get(a.username) ?? 0;
    const fb = followerCountMap.get(b.username) ?? 0;
    return fb - fa || a.username.localeCompare(b.username);
  });
  const sortedByFollowing = [...mappedNodes].sort((a, b) => {
    const fa = followingCountMap.get(a.username) ?? 0;
    const fb = followingCountMap.get(b.username) ?? 0;
    return fb - fa || a.username.localeCompare(b.username);
  });
  const sortedByWeight = [...mappedNodes].sort((a, b) => b.weight - a.weight || a.username.localeCompare(b.username));
  const topWeight = sortedByWeight.slice(0, LEADERBOARD_LIMIT);
  const topFollowers = sortedByFollowers.slice(0, LEADERBOARD_LIMIT);
  const topFollowing = sortedByFollowing.slice(0, LEADERBOARD_LIMIT);
  const followingUsers = sortedByFollowing.filter((n) => (followingCountMap.get(n.username) ?? 0) > 0);
  const followerOnly = sortedByFollowing.filter((n) => (followingCountMap.get(n.username) ?? 0) === 0);
  const secondDegree = sortedByWeight.filter((n) => n.username !== anchorHandle && !anchorFollowingSet.has(n.username));
  const options = mappedNodes.map((n) => n.username);

  const uniqueHandles = new Set<string>();
  mappedNodes.forEach((n) => uniqueHandles.add(n.username));
  mappedLinks.forEach((l) => {
    uniqueHandles.add(l.source);
    uniqueHandles.add(l.target);
  });
  const topNode = topWeight[0];

  const stats = {
    nodes: formatNumber(mappedNodes.length),
    totalNodes: formatNumber(totals?.totalNodes ?? mappedNodes.length),
    edges: formatNumber(mappedLinks.length),
    totalEdges: formatNumber(totals?.totalEdges ?? mappedLinks.length),
    filesIn: formatNumber(buckets?.input?.length || 0),
    filesOut: formatNumber(buckets?.output?.length || 0),
    topNode: topNode ? `@${topNode.username}` : "n/a",
    totalHandles: formatNumber(totals?.totalHandles ?? uniqueHandles.size),
    handles3Plus: formatNumber(mappedNodes.length),
  };

  return {
    nodeMap,
    rawNodeMap,
    followerCountMap,
    followingCountMap,
    rawFollowerCountMap,
    rawFollowingCountMap,
    filteredCountMap,
    sortedFollowers,
    sortedFollowingFiltered,
    sortedFollowersRaw,
    sortedFollowingRaw,
    topWeight,
    topFollowers,
    topFollowing,
    followingUsers,
    followerOnly,
    secondDegree,
    options,
    stats,
  };
};

export const buildVisualizerData = (
  rawNodes: any[],
  rawLinks: any[],
  sourceFilter: SourceFilter,
  anchorHandle: string,
  buckets?: Record<string, string[]>
) => {
  const { mappedNodes, mappedLinks } = mapGraphData(rawNodes, rawLinks);
  const { filteredNodes: sourceNodes, filteredLinks: sourceLinks } = filterGraphBySource(mappedNodes, mappedLinks, sourceFilter);

  const totalHandles = new Set<string>();
  sourceNodes.forEach((n) => totalHandles.add(n.username));
  sourceLinks.forEach((l) => {
    totalHandles.add(l.source);
    totalHandles.add(l.target);
  });

  const baseStats = buildLinkStats(sourceLinks);
  const rawNodeMap = new Map(sourceNodes.map((n) => [n.username, n]));
  let eligible = buildEligibleSet(sourceNodes, baseStats);

  let filteredLinks = filterLinksByEligible(sourceLinks, eligible);
  let filteredNodes = filterNodesByEligible(sourceNodes, eligible);
  let filteredStats = buildLinkStats(filteredLinks);

  while (true) {
    const nextEligible = buildEligibleSet(filteredNodes, filteredStats);
    if (isSameSet(nextEligible, eligible)) break;
    eligible = nextEligible;
    filteredLinks = filterLinksByEligible(sourceLinks, eligible);
    filteredNodes = filterNodesByEligible(sourceNodes, eligible);
    filteredStats = buildLinkStats(filteredLinks);
  }

  const nodesWithLists = buildNodesWithLists(filteredNodes, filteredStats);

  const graphNodes = [...nodesWithLists]
    .sort((a, b) => b.weight - a.weight || a.username.localeCompare(b.username))
    .slice(0, GRAPH_NODE_LIMIT);
  const graphNodeSet = new Set(graphNodes.map((n) => n.username));
  const graphLinks = filterLinksByEligible(filteredLinks, graphNodeSet);

  const derived = computeDerived(
    nodesWithLists,
    filteredLinks,
    anchorHandle,
    buckets,
    {
      totalNodes: sourceNodes.length,
      totalEdges: sourceLinks.length,
      totalHandles: totalHandles.size,
    },
    baseStats,
    rawNodeMap
  );

  return { nodes: nodesWithLists, links: filteredLinks, graphNodes, graphLinks, derived };
};
