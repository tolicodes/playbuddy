import type { Meta, StoryObj } from '@storybook/react';
import LevelButtons from './LevelButtons';

const meta = {
  title: 'Game/LevelButtons',
  component: LevelButtons,
  tags: ['autodocs'],
  argTypes: {
    
  },
} satisfies Meta<typeof LevelButtons>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
  },
};