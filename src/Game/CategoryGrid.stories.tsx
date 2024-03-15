import type { Meta, StoryObj } from '@storybook/react';
import CategoryGrid from './CategoryGrid';

const meta = {
  title: 'Game/CategoryGrid',
  component: CategoryGrid,
  tags: ['autodocs'],
  argTypes: {
    categories: { control: 'array' },
  },
} satisfies Meta<typeof CategoryGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    categories: [{
        value: 'Exploration',
        count: 1
    }, {
        value: 'Intimacy',
        count: 1
    }]
  },
};