import type { Meta, StoryObj } from '@storybook/react';
import LevelButtons from './LevelButtons';
import { Level } from '../KinkLibrary/types';
import { action } from '@storybook/addon-actions';

const meta: Meta<typeof LevelButtons> = {
  title: 'Game/LevelButtons',
  component: LevelButtons,
  argTypes: {
    selectedLevel: {
      control: 'select',
      options: Object.values(Level), // Make sure this only includes string values
    },
  },
};

export default meta;

export const Primary: StoryObj<typeof meta> = {
  args: {
    selectedLevel: Level.Easy, // Provide a default selection
    onClickLevel: action('onClickLevel')
  },
};
