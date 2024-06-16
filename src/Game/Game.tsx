import React, { useEffect, useState } from 'react';
import { useLoadKinks } from '../KinkLibrary/useLoadKinks';

import { Typography, Box, Button } from '@mui/material';
import { Header } from '../Header';
import { Kink } from '../KinkLibrary/types';
import { useFilterKinks } from '../KinkLibrary/useFilterKinks';
import KinkCardGrid from '../KinkLibrary/KinkCardGrid';
import GameSetup from './GameSetup';

const Game: React.FC = () => {
    const kinks = useLoadKinks();
    const { filteredKinks, onFilterChange, categories } = useFilterKinks(kinks);

    enum Mode {
        setup,
        adventure,
    }
    const [mode, setMode] = useState<Mode>(Mode.setup);

    const [randomKinks, setRandomKinks] = useState<Kink[]>([]);

    useEffect(() => {
        shuffleKinks(filteredKinks)
    }, [filteredKinks]);

    const shuffleKinks = (kinks: Kink[]) => {
        const shuffledKinks = kinks.sort(() => 0.5 - Math.random());
        setRandomKinks(shuffledKinks.slice(0, 3))
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 0 }}>
            <Header />
            {mode === Mode.adventure && (
                <>
                    <Box sx={{ p: 2 }}>
                        <Typography variant="h6">Your Adventure</Typography>
                        <Button variant={'contained'} onClick={() => setMode(Mode.setup)}>Change Adventure</Button>
                        <Button variant={'contained'} onClick={() => shuffleKinks(filteredKinks)}>Shuffle</Button>

                        <KinkCardGrid kinks={randomKinks} />
                    </Box>
                </>
            )
            }
            {mode === Mode.setup &&
                <GameSetup
                    categories={categories}
                    onFilterChange={(filters: any) => {
                        onFilterChange(filters)
                        setMode(Mode.adventure)
                    }}
                />
            }
        </Box>
    )
}

export default Game;
