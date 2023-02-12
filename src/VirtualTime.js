/*
The MIT License (MIT)
Copyright (c) 2022 Nikolay Suslov and the Krestianstvo.org project contributors. 
(https://github.com/NikolaySuslov/krestianstvo/blob/master/LICENSE.md)

Virtual World Framework Apache 2.0 license  
(https://github.com/NikolaySuslov/livecodingspace/blob/master/licenses/LICENSE_VWF.md)
*/

import Heap from 'qheap/lib/qheap.js'
import { createEffect } from "solid-js";
import { produce, unwrap } from "solid-js/store";


const datas = {}

export const initTime = (socket, storeID, seloData) => {

    const storeNode = seloData.storeNode,
        setStoreNode = seloData.setStoreNode,
        storeVT = seloData.storeVT,
        setStoreVT = seloData.setStoreVT,
        randomGen = seloData.randomGen


    const data = {
        socket: socket,
        owner: null,
        queue: new Heap({
            compar: queueSort
        }),
        now: 0,
        sequence_: undefined,
        client_: undefined,
        time: 0,
        suspension: 0,
        sequence: 0
    }

    data.insert = (fields, chronic) => {

        var messages = fields instanceof Array ? fields : [fields];

        messages.forEach((fields) => {

            // if ( fields.action ) {  // TODO: don't put ticks on the queue but just use them to fast-forward to the current time (requires removing support for passing ticks to the drivers and nodes)

            fields.sequence = ++data.sequence; // track the insertion order for use as a sort key
            data.queue.insert(fields)

            if (chronic) {
                data.time = Math.max(data.time, fields.time); // save the latest allowed time for suspend/resume
            }

        });

        //Sort here (now in Heap)

        if (chronic) {
            data.dispatch();
        }

    }

    data.pull = () => {

        if (data.suspension == 0 && data.queue.size() > 0 && data.queue.peek().time <= data.time) {
            return data.queue.shift();
        }

    }

    data.filter = (callback /* fields */) => {

        let filtered = data.queue._list.slice().filter(callback);
        data.queue = new Heap({
            compar: queueSort
        });
        filtered.map(el => {
            data.queue.insert(el);
        });

    }

    data.filterQueue = () => {

        data.filter((fields) => {

            if ((fields.origin === "reflector") && fields.sequence > data.sequence_) {
                return true;
            } else {
                console.log("setState", "removing", JSON.stringify(fields), "from queue")
            }

        })
    }

    data.suspend = (why) => {

        if (data.suspension++ == 0) {
            console.log("-queue#suspend", "suspending queue at time", data.now, why ? why : "");
            return true;
        } else {
            console.log("-queue#suspend", "further suspending queue at time", data.now, why ? why : "");
            return false;
        }

    }


    data.resume = (why) => {

        if (--data.suspension == 0) {
            console.log("-queue#resume", "resuming queue at time", data.now, why ? why : "");
            data.dispatch();
            return true;
        } else {
            console.log("-queue#resume", "partially resuming queue at time", data.now, why ? why : "");
            return false;
        }

    }

    data.ready = () => {
        return data.suspension == 0;
    }


    data.stateQueue = () => {
        return {
            time: data.time,
            queue: data.transformQueueList() //transform(data.queue._list, data.queueTransitTransformation),
        }

    }

    data.transformQueueList = () => {

        return data.queue._list.filter(el => el !== 0).filter((fields) => {
            return !(fields.origin === "reflector" && fields.sequence > data.sequence_) && fields.action; // TODO: fields.action is here to filter out tick messages  // TODO: don't put ticks on the queue but just use them to fast-forward to the current time (requires removing support for passing ticks to the drivers and nodes)
        }).sort(function (fieldsA, fieldsB) {
            return fieldsA.sequence - fieldsB.sequence;
        }).map(el => {
            el.sequence ? delete el.sequence : null
            return el
        })

    }

    data.receive = (seloID, nodeID, actionName, memberName, parameters, respond, origin, client) => {

        // Look up the action handler and invoke it with the remaining parameters.

        // Note that the message should be validated before looking up and invoking an arbitrary
        // handler.

        var args = [],
            result;

        if (nodeID || nodeID === 0) args.push(nodeID);
        if (memberName) args.push(memberName);
        if (parameters) args = args.concat(parameters); // flatten
        if (client) args.push(client);

        if (origin !== "reflector" || !nodeID) {

            if (actionName == 'getState') {
                console.log("Get State!");
                setStoreNode("localStores", {})

                setStoreVT("syncSig", true);

                if (storeNode.localSelos[storeID]) {
                    Object.keys(storeNode.localSelos[storeID]).forEach(key => {
                        storeNode.localSelos[storeID][key].setStoreVT("syncSig", true);
                    })
                }

                setStoreVT("getStateSignal", [nodeID, actionName, memberName, parameters, respond]);

                return

            } else if (actionName == 'setState') {

                console.log("SYNC!");
                data.syncAppState(parameters[0]);
                result = undefined

            } else {

                setStoreVT(produce((s) => {
                    s.reflectorMsg = { nodeID, actionName, parameters, client }
                }))
            }

        } else {
            if (nodeID) {
                setStoreVT(produce((s) => {
                    s.reflectorMsg = { nodeID, actionName, parameters, client, seloID }
                }))
            }
        }

        // Return the result.
        setTimeout(() => {
            respond && data.respond(nodeID, actionName, memberName, parameters, result);
        }, 0)


    }

    data.dispatch = () => {

        var fields;

        // Actions may use receive's ready function to suspend the queue for asynchronous
        // operations, and to resume it when the operation is complete.

        while (fields = /* assignment! */ data.pull()) {

            // Advance time to the message time.

            if (data.now != fields.time) {
                data.sequence_ = undefined; // clear after the previous action
                data.client_ = undefined; // clear after the previous action
                data.now = fields.time;
                data.tock();
            }

            // Perform the action.

            if (fields.action) { // TODO: don't put ticks on the queue but just use them to fast-forward to the current time (requires removing support for passing ticks to the drivers and nodes)
                data.sequence_ = fields.sequence; // note the message's queue sequence number for the duration of the action
                data.client_ = fields.client; // ... and note the originating client
                data.receive(fields.seloID, fields.node, fields.action, fields.member, fields.parameters, fields.respond, fields.origin, fields.client);
            } else {
                data.tick();
            }

        }

        // Advance time to the most recent time received from the server. Tick if the time
        // changed.

        if (data.ready() && data.now != data.time) {
            data.sequence_ = undefined; // clear after the previous action
            data.client_ = undefined; // clear after the previous action
            data.now = data.time;
            data.tock();
        }

    }

    data.plan = (nodeID, actionName, memberName, parameters, when, callback_async /* ( result ) */) => {

        var time = when > 0 ? // absolute (+) or relative (-)
            Math.max(data.now, when) :
            data.now + (-when);

        var fields = {
            time: time,
            node: nodeID,
            action: actionName,
            member: memberName,
            parameters: parameters,
            client: data.client_, // propagate originating client
            origin: "future",
            // callback: callback_async,  // TODO
        };

        data.insert(fields);

    }

    data.send = (seloID, nodeID, actionName, memberName, parameters, when, callback_async /* ( result ) */) => {

        var time = when > 0 ? // absolute (+) or relative (-)
            Math.max(data.now, when) :
            data.now + (-when);

        // Attach the current simulation time and pack the message as an array of the arguments.

        var fields = {
            seloID: seloID,
            time: time,
            node: nodeID,
            action: actionName,
            member: memberName,
            parameters: parameters
            // callback: callback_async,  // TODO: provisionally add fields to queue (or a holding queue) then execute callback when received back from reflector
        };


        // Send the message.
        var message = JSON.stringify(fields);
        data.socket.send(message);

    }

    data.respond = (nodeID, actionName, memberName, parameters, result) => {

        console.log("respond", nodeID, actionName, memberName, parameters && parameters.length, "...")


        // Attach the current simulation time and pack the message as an array of the arguments.

        var fields = {
            // sequence: undefined,  // TODO: use to identify on return from reflector?
            time: data.now,
            node: nodeID,
            action: actionName,
            member: memberName,
            parameters: parameters,
            result: result
        };

        // Send the message.

        var message = JSON.stringify(fields);
        data.socket.send(message);

    }

    data.tick = () => {

        const parameters = [data.now];
        setStoreNode("tick", parameters[0])

    };

    data.tock = () => {

        const parameters = [data.now];

        // setStoreNode("tock", parameters[0])

    }

    data.getNow = () => {
        return data.now
    }


    data.getState = () => {

        const storesState = {}

        if (storeNode.localSelos[storeID]) {
            Object.keys(storeNode.localSelos[storeID]).forEach(key => {
                storesState[key] = JSON.stringify(
                    storeNode.localSelos[storeID][key].storeNode,
                    null,
                    //getCircularReplacer(),
                    2
                )
            })
        }

        let obj = {
            "clients": storeNode.clients,
            "configuration": storeNode.configuration,
            "localStores": unwrap(storeNode.localStores)
        }

        let graph = JSON.stringify(
            obj,
            null,
            //getCircularReplacer(),
            2
        )


        let applicationState = {

            // Runtime configuration.

            configuration: storeNode.configuration,

            // Internal kernel state.

            kernel: {
                time: data.now,
            },

            // Global node and descendant deltas.

            appState: graph,
            stores: storesState,

            // Message queue.

            queue: data.stateQueue(),

            prngState: randomGen.prng.exportState()


        };

        setStoreVT("syncSig", false);

        return applicationState
    }

    data.finishSync = () => {

        if (data.syncState) {


            let applicationState = data.syncState

            data.filterQueue()

            // Set the queue time and add the incoming items to the queue.

            if (applicationState.queue) {

                data.time = applicationState.queue.time;

                console.log("Queue Time: ", applicationState.queue.time)
                console.log("Q state: ", applicationState)
                data.insert(applicationState.queue.queue || []);
            }
        }
    }

    data.syncAppState = (res) => {

        let applicationState = res;

        if (applicationState.configuration) {

            setStoreNode("configuration", "randomseed", applicationState.configuration.randomseed);
            setStoreNode("configuration", "prngState", applicationState.prngState);
            randomGen.prng.importState(applicationState.prngState)
        }

        // Update the internal kernel state.

        if (applicationState.kernel) {
            console.log("Time now: ", data.now)
            if (applicationState.kernel.time !== undefined) data.now = applicationState.kernel.time;
        }

        if (applicationState.appState) {

            data.syncState = applicationState

            setStoreVT(produce((s) => {
                s.appState = [applicationState.appState, applicationState.stores, applicationState]
            }))
        }
    }


    createEffect(() => {

        let sig = storeVT.getStateSignal

        if (sig) {

            console.log(sig)
            setTimeout(() => {

                let res = data.getState() //getGraph(owner);
                console.log(res)
                data.respond(sig[0], sig[1], sig[2], sig[3], res);
                setStoreVT("getStateSignal", null)
            }, 0)
        }
    })

    createEffect(() => {

        let msg = storeVT.extMsg
        if (msg) {
            sendExtMsg(msg.name, msg.value, msg.when, msg.nodeID, msg.seloID)
        }
    })

    createEffect(() => {

        let msg = storeVT.intMsg
        if (msg) {
            sendIntMsg(msg.name, msg.value, msg.when, msg.nodeID)
        }
    })

    createEffect(() => {

        let msg = unwrap(storeVT.socketMsg)
        if (msg) {
            queueMicrotask(() =>
                data.insert(msg[0], msg[1])
            )
        }
    })


    function sendIntMsg(msgName, value, when, nodeID) {

        data.plan(nodeID, msgName, undefined,
            [value], when, undefined /* result */);

    }

    function sendExtMsg(msgName, value, when, nodeID, seloID) {

        let params = (Array.isArray(value)) ? value : [value]
        data.send(seloID, nodeID, msgName, undefined,
            params, when || 0, undefined /* result */);
    }

    datas[storeID] = data
    seloData.vTime = data

    return data
}

const queueSort = (a, b) => {

    // Sort by time, then future messages ahead of reflector messages, then by sequence. 

    // The sort by origin ensures that the queue is processed in a well-defined order
    // when future messages and reflector messages share the same time, even if the
    // reflector message has not arrived at the client yet.
    // 
    // The sort by sequence number ensures that the messages remain in their arrival
    // order when the earlier sort keys don't provide the order.

    // Execute the simulation through the new time.

    // To prevent actions from executing out of order, callers should immediately return
    // to the host after invoking insert with chronic set.


    if (a.time != b.time) {
        return a.time - b.time;
    } else if (a.origin != "reflector" && b.origin == "reflector") {
        return -1;
    } else if (a.origin == "reflector" && b.origin != "reflector") {
        return 1;
    } else {
        return a.sequence - b.sequence;
    }

}


export function getTimeData (id) {
    return datas[id]
}
