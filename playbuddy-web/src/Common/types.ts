export type Kink = {
  id: string;
  idea_title: string;
  idea_description: string;
  categories: string[];
  recommended?: boolean;
  status?: Status;
  level?: Level;
  is_group?: boolean;
  needs_supplies?: string;
};

export type Kinks = Kink[];

export enum Level {
  Easy = 'easy',
  Moderate = 'moderate',
  Advanced = 'advanced',
  Xxxtreme = 'xxxtreme',
}

export enum Status {
  Todo = 'todo',
  Done = 'done',
}

export const LEVELS = [
  { label: Level.Easy, color: '#4caf50' },
  { label: Level.Moderate, color: '#ff9800' },
  { label: Level.Advanced, color: '#f44336' },
  { label: Level.Xxxtreme, color: '#9e9e9e' },
];

const levelsToMap = (levels: typeof LEVELS) => {
  const remapped = levels.reduce(
    (acc, level) => {
      acc[level.label] = { ...level };
      return acc;
    },
    {} as Record<Level, (typeof LEVELS)[number]>,
  );
  return remapped;
};

export const LEVEL_MAP = levelsToMap(LEVELS);

export interface OptionType {
  label: string;
  value: string;
  color: string;
  count: number;
}

