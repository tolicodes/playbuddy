import { Container } from '@mui/material';

import Filters from './Filters';
import { useLoadKinks } from './useLoadKinks';
import { useFilterKinks } from './useFilterKinks';
import { Header } from '../Header';
import KinkCardGrid from './KinkCardGrid';


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

                <KinkCardGrid kinks={filteredKinks} />
            </Container>
        </>
    );
};

export default KinkList;
