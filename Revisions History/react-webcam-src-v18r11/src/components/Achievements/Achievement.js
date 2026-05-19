import React from 'react'
import { Award } from 'react-feather'
import './Achievement.css'
import { formatTime } from '../../constants/helpers'
import { useAchievements } from '../../hooks/useAchievements'
import { STR } from '../../constants/stringsreplace'

function Achievement({ id }) {
    const { findAchievement, getProgress, isUnlocked } = useAchievements()

    // Get achievement data and progress
    const achievement = findAchievement(id)
    if (!achievement) return null

    const { icon: Icon = Award, type } = achievement
    const progress = getProgress(id)

    // Calculate completion status based on isUnlocked
    const isCompleted = isUnlocked(id)

    const getProgressDisplay = () => {
        if (!type) return null

        let progressPercent = 0
        let progressText = ''

        switch (type) {
            case 'bool':
                progressPercent = isCompleted ? 100 : 0
                progressText = isCompleted ? 'Completed' : 'Not completed'
                break
            case 'count':
            case 'time':
                progressPercent = (progress / achievement.total) * 100
                progressText = type === 'time'
                    ? `${formatTime(progress)} / ${formatTime(achievement.total)}`
                    : `${progress}/${achievement.total}`
                break
            default:
                return null
        }

        return (
            <div>
                <div className="progress-bar-container">
                    <div
                        className="progress-bar"
                        style={{ width: `${Math.min(100, progressPercent)}%` }}
                    />
                </div>
                <p className='margin-y-sm'>{progressText}</p>
            </div>
        )
    }

    return (
        <div className={`achievement ${isCompleted ? 'border-blue' : 'border-grey'}`}>
            <div className="achievement-icon">
                <Icon size={24} />
            </div>
            <div className="achievement-content">
                <h5 className="margin-y-sm">{STR.Achievement[id]}</h5>
                <p>{STR.AchieveDesc[id]}</p>
                {getProgressDisplay()}
            </div>
        </div>
    )
}

export default Achievement
