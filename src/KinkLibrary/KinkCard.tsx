import { Card, CardContent, Typography } from "@mui/material"
import KinkCardHeader from "./KinkCardHeader"
import { Kink } from "./types"

export const KinkCard = ({ kink }: { kink: Kink }) => {
    return (
        <Card>
            <CardContent>

                <KinkCardHeader kink={kink} />

                {kink.idea_description && <Typography sx={{
                    marginTop: '10px'
                }} variant="body2">{kink.idea_description}</Typography>}

                {kink.needs_supplies && <Typography variant="body2">{kink.needs_supplies}</Typography>}
            </CardContent>
        </Card>
    )
}