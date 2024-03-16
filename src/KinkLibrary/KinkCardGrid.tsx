import { Grid } from "@mui/material"
import KinkCard from "./KinkCard"
import { Kink } from "./types"

const KinkCardGrid = ({ kinks }: { kinks: Kink[] }) => (
    <Grid container spacing={3}>
        {kinks.map((kink, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
                <KinkCard kink={kink} />
            </Grid>
        ))}
    </Grid>
)

export default KinkCardGrid