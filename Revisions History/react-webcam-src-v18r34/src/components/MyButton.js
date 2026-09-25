import React, { useState } from "react";

function MyButton({ mission, onClick }) {
    // const [count, setCount] = useState(0);

    // function increase() {
    //     // count++
    //     setCount(count + 1)
    // }
    // function decrease() {
    //     // count++
    //     setCount(count - 1)
    // }

    return (
        <div>
            <button onClick={onClick}>+ I'm a button</button>
            {/* <br />
            <button onClick={decrease}>-</button> */}
        </div>

    )
}

export default MyButton;