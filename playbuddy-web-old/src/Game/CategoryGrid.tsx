import React from 'react';
import { Grid, CardContent, Typography } from '@mui/material';

import CategoryIcon, { categoryIcons } from './CategoryIcon';
import { CategoryWithCount } from '../KinkLibrary/utils/getCategoriesWithCounts';

import { StyledCard, IconContainer, LabelContainer, StyledRoot } from './CategoryGrid.styles';
import * as amplitude from '@amplitude/analytics-browser';

const CategoryGridItem = ({
  category,
  onClick,
  selected,
}: {
  category: CategoryWithCount;
  onClick: () => void;
  selected: boolean;
}) => {
  return (
    <StyledCard
      onClick={onClick}
      selected={selected}
    >
      <CardContent>
        <IconContainer>
          <CategoryIcon
            category={category.value as keyof typeof categoryIcons}
          />
        </IconContainer>
        <LabelContainer>
          <Typography variant="h6">{category.value}</Typography>
        </LabelContainer>
      </CardContent>
    </StyledCard>
  );
};

const CategoryGrid = ({
  categories,
  selectedCategories,
  setSelectedCategories,
}: {
  categories: CategoryWithCount[];
  selectedCategories: CategoryWithCount[];
  setSelectedCategories: (categories: CategoryWithCount[]) => void;
}) => {
  const onClickCard = (category: CategoryWithCount, categoryIsSelected: boolean) => {
    amplitude.logEvent('category_selected', {
      category: category.value,
      selected: !categoryIsSelected,
    });

    if (categoryIsSelected) {
      setSelectedCategories(
        selectedCategories.filter(
          (selectedCategory) =>
            selectedCategory.value !== category.value,
        ),
      );
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  return (
    <StyledRoot>
      <Grid
        container
        spacing={3}
      >
        {categories.map((category, index) => {
          const categoryIsSelected = selectedCategories.some(
            (selectedCategory) => selectedCategory.value === category.value,
          );

          return (
            <Grid item xs={6} sm={4} md={2}
              key={index}
            >
              <CategoryGridItem
                category={category}
                selected={categoryIsSelected}
                onClick={() => {
                  amplitude.logEvent('category_selected', {
                    category: category.value,
                    selected: !categoryIsSelected,
                  });

                  onClickCard(category, categoryIsSelected)
                }}
              />
            </Grid>
          );
        })}
      </Grid>
    </StyledRoot>
  );
};

export default CategoryGrid;
