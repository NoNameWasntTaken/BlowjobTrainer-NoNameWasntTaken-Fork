import { useAtomValue } from 'jotai'
import { playTimeAtom } from '../atoms/taskAtom'
import { formatTime } from '../constants/helpers'

const PlayTime = () => {
    // Display only - timer logic runs in Playing.js so it works when Navigation is hidden (CLI auto-start)
    const playTime = useAtomValue(playTimeAtom)

    return (
        <div className="not-a-button padding-x-sm play-time">
            <span>{formatTime(playTime)}</span>
        </div >
    )
}

export default PlayTime 