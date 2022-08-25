/*
The MIT License (MIT)
Copyright (c) 2022 Nikolay Suslov and the Krestianstvo.org project contributors.
(https://github.com/NikolaySuslov/krestianstvo/blob/master/LICENSE.md)
*/

import { render } from 'solid-js/web';
//import { initGlobalConfig } from "../Krestianstvo";
import Selo from "../Selo"

import './index.css';
import Play from './Play'

//import configFile from './config.json?raw'
//const [config, setConfig] = initGlobalConfig(JSON.parse(configFile))

render(() => (
    <Selo
        nodeID={"play"}
        seloID={"play"}
        info={true}
        component={Play}
    />

), document.getElementById('root'));
