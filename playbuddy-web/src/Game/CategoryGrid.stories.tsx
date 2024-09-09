import type { Meta, StoryObj } from '@storybook/react';
import CategoryGrid from './CategoryGrid';
import { action } from '@storybook/addon-actions';

const meta = {
  title: 'Game/CategoryGrid',
  component: CategoryGrid,
  tags: ['autodocs'],
} satisfies Meta<typeof CategoryGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    categories: [
      {
        value: 'Exploration',
        count: 1,
      },
      {
        value: 'Intimacy',
        count: 1,
      },
      {
        value: 'BDSM',
        count: 1,
      },
    ],
    selectedCategories: [
      {
        value: 'Intimacy',
        count: 1,
      },
      {
        value: 'BDSM',
        count: 1,
      },
    ],
    setSelectedCategories: action('setSelectedCategories'),
  },
};
