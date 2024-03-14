export type Kink = {
    idea_title: string;
    idea_description: string;
    categories: string[];
    favorite?: boolean;
    status: 'done' | 'todo';
    level: 'easy' | 'medium' | 'advanced' | 'xtreme'
    is_group: boolean;
    needs_supplies: string;
  };
  
export type Kinks = Kink[];
