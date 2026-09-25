import React, { useCallback, useRef } from 'react'
import { useSetAtom } from 'jotai'
import { showHiddenContentAtom } from '../../atoms/hiddenContentAtom'
import { store } from '../../store'

function Instructions() {
    const setShowHidden = useSetAtom(showHiddenContentAtom)
    const seqRef = useRef({ lastTs: 0, count: 0 })

    const onEasterEggClick = useCallback(() => {
        const now = Date.now()
        const { lastTs, count } = seqRef.current
        if (count === 0 || now - lastTs > 1000) {
            seqRef.current = { lastTs: now, count: 1 }
            return
        }
        const next = count + 1
        if (next >= 5) {
            const willShow = !store.get(showHiddenContentAtom)
            setShowHidden(willShow)
            window.alert(
                willShow
                    ? 'Hidden content is now visible.'
                    : 'Hidden content is now concealed.'
            )
            seqRef.current = { lastTs: 0, count: 0 }
        } else {
            seqRef.current = { lastTs: now, count: next }
        }
    }, [setShowHidden])

    return (
        <div className="instructions-container">
            <button
                type="button"
                aria-label="Developer"
                onClick={onEasterEggClick}
                style={{
                    position: 'fixed',
                    bottom: '28px',
                    left: '10px',
                    width: 48,
                    height: 48,
                    padding: 0,
                    margin: 0,
                    border: 'none',
                    background: 'transparent',
                    opacity: 0,
                    cursor: 'default',
                    zIndex: 1001,
                }}
            />
            <h2>Getting Started</h2>
            <div className="instructions-content">
                <section className="instruction-section">
                    <p>Welcome to the Blowjob Trainer application! Follow these steps to begin your training session:</p>
                    <ol>
                        <li>First go to <strong>Calibrate</strong> and <strong>Audio</strong> to set up the tracking of video and audio.</li>
                        <li>Select your desired training level in the <strong>Levels</strong> tab</li>
                        <li>Begin your session in the <strong>Play</strong> tab</li>
                    </ol>
                </section>

                <section className="instruction-section">
                    <h3 className="margin-y-sm">Training Tasks</h3>
                    <p>During your session, you'll encounter various training tasks designed to improve your skills. Each task has specific objectives and requirements:</p>

                    <ul>
                        <li><strong>Get Ready</strong> - Prepare yourself for the upcoming blowjob</li>
                        <li><strong>Rest</strong> - Catch your breath.  If told to lick the balls, this isn't actually tracked in default levels.*</li>
                        <li><strong>Hold Position</strong> - Maintain a specific depth for the duration shown.  If too deep time still accumulates but slower, so aim to hit the correct depth.</li>
                        <li><strong>Suck</strong> - Suck between the given depths at a particular tempo.  Tempo is measured like so.
                            <ul>
                                <li>Slow - (30bpm)</li>
                                <li>Medium - (60bpm) which is 1 sec down. 1 sec up.</li>
                                <li>Fast - (90bpm)</li>
                            </ul>
                        </li>
                        <li><strong>Hit Depth</strong> - Just reach the target depth the specified number of times, don't need to hold</li>
                        <li><strong>Hold and Clap</strong> - Maintain a specific depth while slapping yourself. If too deep slaps count for less than one, so aim to hit the correct depth. Not used in default levels.</li>
                        <li><strong>Speak</strong> - Say a phrase out loud. Watch the UI to see what the system heard. Not used in default levels.</li>
                        <li><strong>Endless</strong> - Long task with no hold or suck targets. Earn rest by scoring with dives and holds. Earn bonus points for deeper holds, consistent depth and rhythm in sucks, and licking the balls during rest. Not used in default levels.</li>
                    </ul>
                    <p>*Licking the balls can be tracked in custom levels. Configure a "Balls region" grid, and enable "Balls bonus" in the Rest task. During rest, stay on the balls for at least 1 second to earn bonus points.</p>
                </section>
                <section className="instruction-section">
                    <h3 className="margin-y-sm">Scoring</h3>
                    <ul>
                        <li><strong>Perfect</strong> - Aim to match the tempo/depth given to gain perfect scores</li>
                        <li><strong>Deepthroats</strong> - Deepthroats have special bonuses!  So focus on doing these well.</li>
                        <li><strong>Penalties</strong> - Unauthorized breaks will result in penalties, so keep that cock in your mouth unless told</li>
                    </ul>
                </section>

                <section className="instruction-section">
                    <h3 className="margin-y-sm">Controls & Tips</h3>
                    <p>You can <strong>Pause</strong> during a level, you will lose progress for the task you are on, but it does allow you to recalibrate if needed.  No other penalty for pausing.</p>
                    <p>Bright <strong>colored dildos</strong> that contrast your skin color are best, and <strong> good lighting </strong> helps keep the tracking too.  You'll cast shadows as you play.</p>
                    <p>Most importantly, have fun and <strong>play safe.</strong> </p>
                </section>
            </div>
        </div >
    )
}

export default Instructions
