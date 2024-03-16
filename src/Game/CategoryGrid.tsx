import React from 'react';
import { Card, Grid, CardContent, Typography } from '@mui/material';
import { styled } from '@mui/system';

import CategoryIcon, { categoryIcons } from './CategoryIcon';
import { CategoryWithCount } from '../KinkLibrary/useExtraCategories';


const StyledCard = styled(Card)<{ selected: boolean }>(({  selected }) => ({
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: selected ? '#007bff' : '#ffffff',
    color: selected ? '#FFFFFF' : '#000000',
    // Add more styles for the selected state here, e.g., border color, text color, etc.
    cursor: 'pointer', // Optional: change cursor to pointer to indicate it's clickable

}));

const IconContainer = styled('div')({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '16px',
});

const LabelContainer = styled('div')({
    textAlign: 'center', // Center the text for longer labels
});

const CategoryGridItem = ({ category, onClick, selected }: {
    category: CategoryWithCount,
    onClick: () => void,
    selected: boolean,
}) => {
    return (
        <StyledCard onClick={onClick} selected={selected}> {/* Pass selected as a prop to StyledCard */}
            <CardContent>
                <IconContainer>
                    <CategoryIcon category={category.value as keyof typeof categoryIcons} />
                </IconContainer>
                <LabelContainer>
                    <Typography variant="h6">{category.value}</Typography>
                </LabelContainer>
            </CardContent>
        </StyledCard>
    );
};

const StyledRoot = styled('div')(({ theme }) => ({
    flexGrow: 1,
    padding: theme.spacing(3), // Use theme spacing for consistency
}));

const CategoryGrid = ({ categories, selectedCategories, setSelectedCategories }:
    { categories: CategoryWithCount[], selectedCategories: CategoryWithCount[], setSelectedCategories: (categories: CategoryWithCount[]) => void }
) => {
    return (
        <StyledRoot>
            <Grid container spacing={3}>
                {categories.map((category, index) => {
                    const categoryIsSelected = selectedCategories.some((selectedCategory) => selectedCategory.value === category.value);
                    const onClickCard = () => {
                        if (categoryIsSelected) {
                            setSelectedCategories(selectedCategories.filter((selectedCategory) => selectedCategory.value !== category.value));
                        } else {
                            setSelectedCategories([...selectedCategories, category]);
                        }
                    };

                    return (
                        <Grid item xs={6} sm={4} md={2} key={index}>
                            <CategoryGridItem category={category} selected={categoryIsSelected} onClick={onClickCard} />
                        </Grid>);
                })}
            </Grid>
        </StyledRoot>
    );
};


export default CategoryGrid