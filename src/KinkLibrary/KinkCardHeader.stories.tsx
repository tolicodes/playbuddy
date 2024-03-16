import type { Meta, StoryObj } from '@storybook/react';
import KinkCardHeader from './KinkCardHeader';
import { Level, Status } from './types';


const meta = {
  title: 'Game/KinkCardHeader',
  component: KinkCardHeader,
  tags: ['autodocs'],
} as Meta

export default meta;
type Story = StoryObj<typeof meta>;

const kink = {
    idea_title: "Fuck Out the Argument",
    idea_description: "If you're having an argument, it's one of the best ways to let all the anger and pressure out. Start with play fighting. There's something satisfying about overpowering someone and being overpowered. Dogs play fight all the time. Why can't we? A lot of times after, we forgot why we were arguing.",
    categories: [
        "Physical Play",
        "Primal",
        "Bonding",
        "Emotional"
    ],
    favorite: true,
    status: Status.Done,
    level: Level.Easy,
    is_group: true,
    needs_supplies: "Rope",
  };

export const Primary: Story = {
  args: {
    kink,
  },
};