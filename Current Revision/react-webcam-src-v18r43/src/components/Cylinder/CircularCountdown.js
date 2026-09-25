import React, { useState, useEffect } from 'react';

function CircularCountdown({ duration }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let start = Date.now();

    const tick = () => {
      const elapsed = Date.now() - start;
      const percentage = Math.min((elapsed / duration) * 100, 100);
      setProgress(percentage);

      if (percentage < 100) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);

    // Cleanup function
    return () => cancelAnimationFrame(tick);
  }, [duration]);

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width="120" height="120">
      {/* Background Circle */}
      <circle
        stroke="var(--line)"
        fill="transparent"
        strokeWidth="10"
        r={radius}
        cx="60"
        cy="60"
      />
      {/* Progress Circle */}
      <circle
        stroke="var(--accent)"
        fill="transparent"
        strokeWidth="10"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        r={radius}
        cx="60"
        cy="60"
        transform="rotate(-90 60 60)"
      />
      {/* Countdown Text */}
      <text
        x="60"
        y="60"
        textAnchor="middle"
        dy="0.3em"
        fontSize="20"
        fill="var(--ink)"
      >
        {Math.ceil((duration - (progress / 100) * duration) / 1000)}
      </text>
    </svg>
  );
}

export default CircularCountdown;
