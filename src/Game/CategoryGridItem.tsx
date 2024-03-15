import { Card, CardContent, Typography, styled } from '@mui/material';

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

export default CategoryGridItem