export type Kink = {
    idea_title: string;
    idea_description: string;
    categories: string[];
    favorite?: boolean;
    status: Status
    level: Level
    is_group: boolean;
    needs_supplies: string;
  };
  
export type Kinks = Kink[];

export enum Level {
  Easy = "easy",
  Moderate = "moderate",
  Advanced = "advanced",
  Xxxtreme = "xxxtreme"
}

export enum Status {
  Todo = "todo",
  Done = "done"
}

export const LEVELS = [
  { label: Level.Easy, color: '#4caf50', hoverColor: '#388e3c',  },
  { label: Level.Moderate, color: '#ff9800', hoverColor: '#f57c00', },
  { label: Level.Advanced, color: '#f44336', hoverColor: '#d32f2f',  },
  { label: Level.Xxxtreme, color: '#9e9e9e', hoverColor: '#616161',  },
];

const remapLevels = (levels: typeof LEVELS) => {
  const remapped = levels.reduce((acc, level) => {
    acc[level.label] = { ...level };
    return acc;
  }, {} as Record<Level, typeof LEVELS[number]>);
  return remapped;
};

export const LEVEL_MAP = remapLevels(LEVELS);