import React from 'react'

function VoiceSettingSlider({
    label,
    value,
    onChange,
    min,
    max,
    step = 1,
    formatValue,
}) {
    const handleChange = (e) => {
        onChange(parseFloat(e.target.value))
    }

    const display = formatValue
        ? formatValue(value)
        : min >= 0 && max <= 100
          ? `${Math.round(value)}%`
          : String(Math.round(value))

    return (
        <div className="row-centered voice-setting-slider" style={{ gap: '8px' }}>
            <label style={{ minWidth: '140px' }}>{label}</label>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={handleChange}
                className="voice-setting-slider-input"
            />
            <span className="voice-setting-slider-value">{display}</span>
        </div>
    )
}

export default VoiceSettingSlider
