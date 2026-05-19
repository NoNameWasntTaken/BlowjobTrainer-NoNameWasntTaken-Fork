import React from 'react';

const HOLD_DELAY = 300; // ms before auto-repeat starts
const REPEAT_INTERVAL = 60; // ms between repeats

const NumberControl = ({ label, value, setValue, min = -Infinity, max = Infinity, step = 1, disabled = false, centerRow = false }) => {
    const holdTimeout = React.useRef(null);
    const repeatInterval = React.useRef(null);

    const changeValue = (delta) => {
        setValue((v) => {
            const next = v + (delta * step);
            if (next < min) return min;
            if (next > max) return max;
            return next;
        });
    };

    const handlePress = (delta) => {
        changeValue(delta);
        holdTimeout.current = setTimeout(() => {
            repeatInterval.current = setInterval(() => {
                changeValue(delta);
            }, REPEAT_INTERVAL);
        }, HOLD_DELAY);
    };

    const handleRelease = () => {
        clearTimeout(holdTimeout.current);
        clearInterval(repeatInterval.current);
    };

    const handleInputChange = (e) => {
        const raw = e.target.value;
        if (raw === '') {
            setValue(() => min);
            return;
        }
        const num = parseFloat(raw);
        if (!isNaN(num)) {
            const clamped = Math.min(max, Math.max(min, num));
            setValue(() => clamped);
        }
    };

    return (
        <div className='margin-x' style={centerRow ? { textAlign: 'center' } : undefined}>
            <div style={{ textAlign: 'center' }}>{label}</div>
            <div className="number-control-container">
                <button
                    className="number-control-btn minus"
                    onMouseDown={() => handlePress(-1)}
                    onMouseUp={handleRelease}
                    onMouseLeave={handleRelease}
                    onTouchStart={() => handlePress(-1)}
                    onTouchEnd={handleRelease}
                    onTouchCancel={handleRelease}
                    disabled={disabled || value <= min}
                >
                    -
                </button>
                <input
                    type="number"
                    className="number-control-value"
                    value={value}
                    onChange={handleInputChange}
                    min={min}
                    max={max}
                    step={step}
                    aria-label={label}
                    disabled={disabled}
                />
                <button
                    className="number-control-btn plus"
                    onMouseDown={() => handlePress(1)}
                    onMouseUp={handleRelease}
                    onMouseLeave={handleRelease}
                    onTouchStart={() => handlePress(1)}
                    onTouchEnd={handleRelease}
                    onTouchCancel={handleRelease}
                    disabled={disabled || value >= max}
                >
                    +
                </button>
            </div>
        </div>
    );
};

export default NumberControl;
