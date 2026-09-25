import React from "react";

/**
 * ShaftReading component
 * @param {string} label - The label to display above the value
 * @param {number} percent - The percentage value to display (0-100)
 * @param {number} [raw] - The raw value to display below (optional, for debug)
 */
function ShaftReading({ label = "Shaft %", percent = 0, subtitle = "% visible", placeholder = false }) {
    return (
        <div className={"column-centered margin-y-sm width-lg"}>
            <div style={{ marginTop: 2 }}>{label}</div>
            <div
                className="shaftreading-box round border-grey"
                style={{
                    width: 64,
                    height: 38,
                    margin: '0 auto',
                    marginBottom: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 20,
                }}
            >
                {placeholder ? '-' : Math.round(percent)}
            </div>

            <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                {subtitle}
            </div>

        </div>
    );
}

export default ShaftReading;
