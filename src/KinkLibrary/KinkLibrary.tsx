import { Container, Grid } from '@mui/material';

import Filters from './Filters';
import { useLoadKinks } from './useLoadKinks';
import { useFilterKinks } from './useFilterKinks';
import { Header } from '../Header';
import { KinkCard } from './KinkCard';


const KinkList = () => {
    const allKinks = useLoadKinks();
    console.log(allKinks.map((k) => k.idea_title).join('\n'))

    const { filteredKinks, onFilterChange, categories } = useFilterKinks(allKinks);

    console.log(categories.map((cat) => cat.value).join('\n'))

    return (
        <>
            <Header />

            <Container>
                <Filters categories={categories} onFilterChange={onFilterChange} />

                <Grid container spacing={3}>
                    {filteredKinks.map((kink, index) => (
                        <Grid item xs={12} md={6} lg={4} key={index}>
                            <KinkCard kink={kink} />
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </>
    );
};

export default KinkList;
