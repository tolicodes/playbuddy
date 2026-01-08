export type GraphNode = {
  username: string;
  followers: string[];
  following: string[];
  fullName?: string;
  profilePicUrl?: string;
  weight: number;
  followersCount?: number;
  followingCount?: number;
  source?: 'instagram' | 'fetlife';
};

export type GraphLink = { source: string; target: string };

export type DerivedData = {
  nodeMap: Map<string, GraphNode>;
  rawNodeMap: Map<string, GraphNode>;
  followerCountMap: Map<string, number>;
  followingCountMap: Map<string, number>;
  rawFollowerCountMap: Map<string, number>;
  rawFollowingCountMap: Map<string, number>;
  filteredCountMap: Map<string, { followers: number; following: number }>;
  sortedFollowers: Map<string, string[]>;
  sortedFollowingFiltered: Map<string, string[]>;
  sortedFollowersRaw: Map<string, string[]>;
  sortedFollowingRaw: Map<string, string[]>;
  topWeight: GraphNode[];
  topFollowers: GraphNode[];
  topFollowing: GraphNode[];
  followingUsers: GraphNode[];
  followerOnly: GraphNode[];
  secondDegree: GraphNode[];
  options: string[];
  stats: {
    nodes: string;
    totalNodes: string;
    edges: string;
    totalEdges: string;
    filesIn: string;
    filesOut: string;
    topNode: string;
    totalHandles: string;
    handles3Plus: string;
  };
};
