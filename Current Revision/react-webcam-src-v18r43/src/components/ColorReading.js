import React from "react";

/**
 * ColorReading component
 * @param {string} label - The label to display above the color box
 * @param {{r: number, g: number, b: number}} color - The color to display (object with r, g, b)
 * @param {string} [className] - Optional extra className for the root
 */
function ColorReading({ label = "Color", color = { r: 0, g: 0, b: 0 }, placeholder = false }) {
    // CRITICAL SAFETY CHECK: Ensure color is a color object, not a grid object
    if (!color || typeof color !== 'object' || !('r' in color) || !('g' in color) || !('b' in color) || ('id' in color) || ('name' in color)) {
        color = { r: 0, g: 0, b: 0 };
    }
    
    if (placeholder) {
        return (
            <div className={"column-centered margin-y-sm width-lg"}>
                <div style={{ marginTop: 2 }}>{label}</div>
                <div
                    className="colorreading-box round border-grey"
                    style={{
                        background: 'var(--surface-soft)',
                        width: 64,
                        height: 38,
                        margin: '0 auto',
                        marginBottom: 6,
                        border: '1px solid var(--line)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 18,
                    }}
                >
                    -
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                    -
                </div>
            </div>
        );
    }
    
    return (
        <div className={"column-centered margin-y-sm width-lg"}>
            <div style={{ marginTop: 2 }}>{label}</div>
            <div
                className="colorreading-box round border-grey"
                style={{
                    background: `rgb(${color.r},${color.g},${color.b})`,
                    width: 64,
                    height: 38,
                    margin: '0 auto',
                    marginBottom: 6,
                    border: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            />
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                rgb({color.r}, {color.g}, {color.b})
            </div>
        </div >
    );
}

export default ColorReading;
