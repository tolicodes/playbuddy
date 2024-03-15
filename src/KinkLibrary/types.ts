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
  { label: Level.Easy, color: '#A8E6CF', hoverColor: '#81C7A5', textColor: '#000000' }, // Pastel green
  { label: Level.Moderate, color: '#FFD3B6', hoverColor: '#FFB997',  textColor: '#000000' }, // Pastel orange
  { label: Level.Advanced, color: '#FFAAA5', hoverColor: '#FF8B94',  textColor: '#000000' }, // Pastel red
  { label: Level.Xxxtreme, color: '#FFECB3', hoverColor: '#FFDB8B',  textColor: '#000000' }, // Pastel yellow
];


// Create a map of level to color
export const LEVEL_COLORS = LEVELS.reduce((acc, level) => {
  acc[level.label] = level.color;
  return acc;
}, {} as Record<Level, string>);

// Create a map of level to color
export const LEVEL_TEXT_COLORS = LEVELS.reduce((acc, level) => {
  acc[level.label] = level.textColor;
  return acc;
}, {} as Record<Level, string>);