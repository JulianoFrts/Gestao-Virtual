import { useAnchorStore } from '../../store/anchorStore'
import { AnchorMarker } from './AnchorMarker'

export function Anchors() {
    const anchors = useAnchorStore(s => s.anchors)

    return (
        <>
            {anchors.map(anchor => (
                <AnchorMarker key={anchor.id} anchor={anchor} />
            ))}
        </>
    )
}
