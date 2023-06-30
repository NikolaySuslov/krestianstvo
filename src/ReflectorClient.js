/*
The MIT License (MIT)
Copyright (c) 2023 Nikolay Suslov and the Krestianstvo.org project contributors. 
(https://github.com/NikolaySuslov/krestianstvo/blob/master/LICENSE.md)

Virtual World Framework Apache 2.0 license  
(https://github.com/NikolaySuslov/livecodingspace/blob/master/licenses/LICENSE_VWF.md)
*/

import { produce } from "solid-js/store";
import { createWS, createWSState } from "@solid-primitives/websocket";
import { createEventSignal } from "@solid-primitives/event-listener";
import { createEffect, on } from "solid-js";
import { init } from '@paralleldrive/cuid2'

const connections = {}

const createId = init({
    length: 10
  })

export const connect = function (path, storeID, seloData, hostURL) {

    const globalConfig = localStorage.getItem("krestianstvo");
    const conf = globalConfig ? JSON.parse(globalConfig) : {
        defaultReflectorHost: 'https://localhost:3001'
        //'https://time.livecoding.space'
    }

    const host = hostURL ? hostURL : conf.defaultReflectorHost
    let objToRef = path ? path : { "loadInfo": {}, "path": { "application": "index.vwf", "instance": "O4t2lsAgzKtJoxkH", "public_path": "/empty" }, "user": "w" }
    let moniker_ = createId();
    let query = `pathname=w&appRoot=./public&moniker=` + moniker_ + `&path=` + JSON.stringify(objToRef)

    //let host = "wss://localhost:3001"
    let url = host.replace("https", "wss") + "/?" + query
    const ws = createWS(url);
    const state = createWSState(ws);
    const states = ["Connecting", "Connected", "Disconnecting", "Disconnected"];
    createEffect(() => {
        console.log("WebSocket: ", states[state()])
    })

    const messageEvent = createEventSignal(ws, "message");
    const message = () => {
        return messageEvent() ? (Object.assign(JSON.parse(messageEvent().data), { "origin": "reflector" })) : null
    }

    seloData.setStoreVT(produce((s) => {
        s.moniker_ = moniker_
    }))

    const connection = {
        host: host,
        socket: ws,
        message: message,
        state: state
    }

    connection.disconnect = function () {
        console.log("Disconnecting...")
        connection.socket?.close();
    }

    connections[storeID] = connection
    return connection
}