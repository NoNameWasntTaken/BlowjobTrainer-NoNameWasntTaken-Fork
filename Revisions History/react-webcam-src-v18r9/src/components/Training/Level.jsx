import React from "react";
import './Level.css'
import { Clock } from "react-feather";
import { levelDifficultyService } from '../../services/levelDifficultyService';
import { calculateLevelDuration } from "../Tasks/task";
import { useAtomValue } from 'jotai'
import { sessionStatsAtom } from '../../atoms/playerAtom'
import { STR } from '../../constants/stringsreplace'
import { Rank } from "../../atoms/taskAtom";
import { Star } from "react-feather";

const Level = ({ level, isSelected, onSelect }) => {
    // Calculate the level duration based on tasks
    const duration = level.tasks ? calculateLevelDuration(level.tasks) : level.duration || "Unknown";
    const difficulty = levelDifficultyService.getDifficulty(level);
    const sessionStats = useAtomValue(sessionStatsAtom)
    const levelStats = sessionStats.levelScores[level.id]

    console.log(sessionStats);

    const renderStars = (rank) => {
        if (rank === Rank.MASTER) {
            return (<><Star size={12} /><Star size={12} /><Star size={12} /></>)
        }
        else if (rank === Rank.JOURNEYMAN) {
            return (<><Star size={12} /><Star size={12} /></>)
        }
        else if (rank === Rank.APPRENTICE) {
            return (<><Star size={12} /></>)
        }
        else {
            return (<></>)
        }
    }

    // have we played this?
    let hasPlayed = levelStats

    return (
        <div className={`level  ${isSelected ? 'border-blue' : 'border-grey'}`}>
            <div className="column-centered" style={{ flex: 1 }}>
                <h5>{level.title}</h5>
                <p className="margin-y-sm">{level.description}</p>
                <div className="row-centered margin-y-sm">
                    <Clock size={16} className="margin-xr-sm" /> <pre>{duration}</pre>
                </div>

                {hasPlayed && <p className="margin--sm">Rank: {STR.rankStr(levelStats.rank)} {renderStars(levelStats.rank)}</p>}
                {hasPlayed && <p className="margin--sm">Score: {levelStats.bestScore} | played x {levelStats.attempts}</p>}

                {!hasPlayed && <p className="margin--sm">- - -</p>}
                {!hasPlayed && <p className="margin--sm">- - -</p>}


                <button className={isSelected ? "button button-primary" : "button"}
                    onClick={() => onSelect(level)} >
                    Level {level.order}
                </button>
                <p className="level-difficulty">Difficulty: {difficulty}</p>
            </div>
        </div>
    )
}

export default Level