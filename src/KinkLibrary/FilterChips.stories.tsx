import type { Meta, StoryObj } from '@storybook/react';
import FilterChips from './FilterChips';
import { fn } from '@storybook/test';
import { action } from '@storybook/addon-actions';


const meta = {
  title: 'Game/FilterChips',
  component: FilterChips,
  tags: ['autodocs'],
} satisfies Meta<typeof FilterChips>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    options: [{ value: 'Exploration', count: 1 }, { value: 'Intimacy', count: 1 }],
    selected: ['Exploration'],
    onSelect: action('onSelect'),
    mode: 'multiple',
    top: 20,
  },
};