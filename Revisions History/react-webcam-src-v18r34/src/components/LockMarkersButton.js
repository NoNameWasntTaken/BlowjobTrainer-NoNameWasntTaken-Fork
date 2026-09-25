import React, { useState } from "react";

function LockMarkersButton({ markers, count, onClick }) {
    // const [count, setCount] = useState(0);

    // function increase() {
    //     // count++
    //     setCount(count + 1)
    // }
    // function decrease() {
    //     // count++
    //     setCount(count - 1)
    // }

    let isDisabled = markers.length !== 4

    return (
        <div>
            <h1>{count}</h1>
            <button onClick={onClick} disabled={isDisabled}> {count === 0 ? "Lock" : "Unlock"} Markers</button>
            {/* <br />
            <button onClick={decrease}>-</button> */}
        </div>

    )
}

export default LockMarkersButton;