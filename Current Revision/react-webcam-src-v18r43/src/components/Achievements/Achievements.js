import React from 'react'
import Achievement from './Achievement'
import Stats from './Stats'
import ProfileManager from './ProfileManager'
import { achievements } from './achievementsData'
import { DEBUG } from '../../App'

function Achievements() {
    const filteredAchievements = achievements
        .filter(achievement => DEBUG || !achievement.inDevelopment)
        .sort((a, b) => a.order - b.order)

    return (
        <div>
            <h2 className="tab-title">Profiles</h2>
            <ProfileManager />
            <Stats>
                <div className="grid-three">
                    {filteredAchievements.map((achievement, index) => (
                        <Achievement
                            key={index}
                            id={achievement.id}
                        />
                    ))}
                </div>
            </Stats>
        </div>
    )
}

export default Achievements 