import type { Meta, StoryObj } from '@storybook/react';
import CategoryIcon, { categoryIcons } from './CategoryIcon';

const meta = {
  title: 'Game/CategoryIcon',
  component: CategoryIcon,
  tags: ['autodocs'],
  argTypes: {
    category: { control: 'radio', options: Object.keys(categoryIcons) },
  },
} satisfies Meta<typeof CategoryIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    category: 'Exploration',
  },
};
