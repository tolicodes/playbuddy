import React, { useState } from 'react';
import { Typography } from '@mui/material';

import CategoryGrid from './CategoryGrid';
import LevelButtons from './LevelButtons';
import { Level } from '../Common/types';
import { CategoryWithCount } from '../KinkLibrary/utils/getCategoriesWithCounts';
import * as amplitude from '@amplitude/analytics-browser';

import {
  StyledContainer,
  StyledScrollableBox,
  StyledFooter,
  AdventureButton,
} from './GameSetup.styles';

export const GameSetup = ({
  categories,
  onFilterChange,
}: {
  categories: CategoryWithCount[];
  onFilterChange: (filters: any) => void;
}) => {
  // Sort options by count (descending) and apply the limit
  const sortedAndLimitedCategories = categories
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 20 || categories.length);

  const [selectedLevel, setSelectedLevel] = useState<Level>();
  const [selectedCategories, setSelectedCategories] = useState<
    CategoryWithCount[]
  >([]);

  const onClickAdventure = () => {
    const filterOpts = {
      level: selectedLevel,
      selectedCategories: selectedCategories.map((category) => category.value),
    };

    amplitude.logEvent('adventure_start', filterOpts);

    onFilterChange(filterOpts);
  };

  return (
    <>
      <StyledContainer>
        <Typography>
          Pick a level and 3+ categories, then click "Adventure" to begin your
          Adventure!
        </Typography>
      </StyledContainer>

      <StyledContainer>
        <LevelButtons
          selectedLevel={selectedLevel}
          onClickLevel={setSelectedLevel}
        />
      </StyledContainer>

      <StyledScrollableBox>
        <CategoryGrid
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
          categories={sortedAndLimitedCategories}
        />
      </StyledScrollableBox>

      <StyledFooter>
        <AdventureButton
          variant="contained"
          size="large"
          onClick={onClickAdventure}
        >
          Adventure!
        </AdventureButton>
      </StyledFooter>
    </>
  );
};

export default GameSetup;
