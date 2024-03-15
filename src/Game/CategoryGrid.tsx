import React from 'react';
import { Card, Grid, CardContent, Typography } from '@mui/material';
import { styled } from '@mui/system';

import CategoryIcon, { categoryIcons } from './CategoryIcon';
import { CategoryWithCount } from '../KinkLibrary/useExtraCategories';


const StyledCard = styled(Card)({
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
});

const IconContainer = styled('div')({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '16px',
});

const LabelContainer = styled('div')({
    textAlign: 'center', // Center the text for longer labels
});

const CategoryGridItem = ({ category }: { category: CategoryWithCount }) => {
    return (
        <StyledCard>
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

const CategoryGrid = ({ categories }: { categories: CategoryWithCount[] }) => {
    return (
        <StyledRoot>
            <Grid container spacing={3}>
                {categories.map((category, index) => (
                    <Grid item xs={6} sm={4} md={2} key={index}>
                        <CategoryGridItem category={category} />
                    </Grid>
                ))}
            </Grid>
        </StyledRoot>
    );
};


export default CategoryGrid