import React, { useState } from 'react';
import NumberControl from './NumberControl';

const RGBControl = () => {
    const [red, setRed] = useState(0);
    const [green, setGreen] = useState(0);
    const [blue, setBlue] = useState(0);

    return (
        <div className='row-centered margin-y'>
            <NumberControl label="Red" value={red} setValue={setRed} min={0} max={255} />
            <NumberControl label="Green" value={green} setValue={setGreen} min={0} max={255} />
            <NumberControl label="Blue" value={blue} setValue={setBlue} min={0} max={255} />
        </div>
    );
};

export default RGBControl; 