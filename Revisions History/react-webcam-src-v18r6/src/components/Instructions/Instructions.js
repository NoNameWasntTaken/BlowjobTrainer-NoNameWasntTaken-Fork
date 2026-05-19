import React from 'react'

function Instructions() {
    return (
        <div className="instructions-container">
            <h2>Getting Started</h2>
            <div className="instructions-content">
                <section className="instruction-section">
                    <p>Welcome to the Blowjob Trainer application! Follow these steps to begin your training session:</p>
                    <ol>
                        <li>First go to <strong>Calibrate</strong> and <strong>Mic</strong> to set up the tracking of video and audio.</li>
                        <li>Select your desired training level in the <strong>Levels</strong> tab</li>
                        <li>Begin your session in the <strong>Play</strong> tab</li>
                    </ol>
                </section>

                <section className="instruction-section">
                    <h3 className="margin-y-sm">Training Tasks</h3>
                    <p>During your session, you'll encounter various training tasks designed to improve your skills. Each task has specific objectives and requirements:</p>

                    <ul>
                        <li><strong>Get Ready</strong> - Prepare yourself for the upcoming blowjob</li>
                        <li><strong>Rest</strong> - Catch your breath.  If told to lick the balls this isn't actually tracked but you should play along. </li>
                        <li><strong>Hold Position</strong> - Maintain a specific depth for the duration shown.  If too deep time still accumulates but slower, so aim to hit the correct depth.</li>
                        <li><strong>Suck</strong> - Suck between the given depths at a particulaar tempo.  Tempo is measured like so.
                            <ul>
                                <li>Slow - (30bpm)</li>
                                <li>Medium - (60bpm) which is 1 sec down. 1 sec up.</li>
                                <li>Fast - (90bpm)</li>
                            </ul>
                        </li>
                        <li><strong>Hit Depth</strong> - Just reach the target depth the specified number of times, don't need to hold</li>
                    </ul>
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
                    <p>You can <strong>Pause</strong> during a level, you will loose progress for the task you are on, but it does allow you to recalibrate if needed.  Not other penalty for it.</p>
                    <p>Bright <strong>colored dildos</strong> that contrast with yor skin color is best, and <strong> good lighting </strong> helps keep the trackign too.  You'll cast shadows as you play.</p>
                    <p>Most importantly, have fun and <strong>play safe.</strong> </p>
                </section>
            </div>
        </div >
    )
}

export default Instructions 