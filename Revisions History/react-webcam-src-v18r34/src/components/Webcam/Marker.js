import React from "react";

function Marker({ left, top, size, label, }) {
    return (
        <div
            className="marker-circle"
            style={{ left: `${left}px`, top: `${top}px`, width: `${size}px`, height: `${size}px` }}>
            {label}
        </div>
    );
}

export default Marker;
