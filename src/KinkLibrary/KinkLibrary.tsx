import { Container } from '@mui/material';

import Filters from './Filters';
import { useLoadKinks } from './useLoadKinks';
import { useFilterKinks } from './useFilterKinks';
import { Header } from '../Header';
import KinkCardGrid from './KinkCardGrid';


const KinkList = () => {
    const allKinks = useLoadKinks();

    const { filteredKinks, onFilterChange, categories } = useFilterKinks(allKinks);

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
