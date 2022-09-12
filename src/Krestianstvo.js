/*
The MIT License (MIT)
Copyright (c) 2022 Nikolay Suslov and the Krestianstvo.org project contributors.
(https://github.com/NikolaySuslov/krestianstvo/blob/master/LICENSE.md)
*/

import { createSignal, createEffect, createMemo, createRoot, getOwner, createReaction, on, DEV, untrack } from "solid-js";
import { createStore, reconcile, produce, unwrap } from "solid-js/store";
import { connect } from './ReflectorClient'

import { v4 as uuidv4 } from 'uuid';
import { v5 as uuidv5 } from 'uuid';
import { initTime } from './VirtualTime'
import Alea from 'alea/alea.js'
import QrCreator from 'qr-creator';

const validIDChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const selos = {}
const seloDatas = {}

export const getSelos = () => {
    return selos
}

export const collectParentSelos = (id) => {
    let parents = []
    parents.push(id)
    geParentSelo(id, parents)
    return parents
}

export const geParentSelo = (id, parents) => {
    let mySelo = seloDatas[id]

    if (mySelo) {

        if (mySelo.parentSeloID) {
            parents.push(mySelo.parentSeloID)
            return geParentSelo(mySelo.parentSeloID, parents)
        } else {
            return false
        }

    } else {
        return false
    }


}


export const hasParentSelo = (id, findID) => {

    let parents = []
    findParentSelo(id, findID, parents)
    return parents.length
}

export const findParentSelo = (id, findID, parents) => {
    let mySelo = seloDatas[id]

    if (mySelo) {

        if ((mySelo.id == findID) || (mySelo.parentSeloID && mySelo.parentSeloID == findID)) {
            parents.push(findID)
            return true
        } else {
            return findParentSelo(mySelo.parentSeloID, findID, parents)

        }

    } else {
        return false
    }

}

export const initGlobalConfig = (obj) => {

    return createRoot(() => {
        const confName = "krestianstvo"
        const defaultConfigObj = obj ? obj : {}
        const defaultConfig = localStorage.getItem(confName);
        const [config, setConfig] = createStore(
            defaultConfig ? JSON.parse(defaultConfig) : defaultConfigObj
        );
        createEffect(() => localStorage.setItem(confName, JSON.stringify(config)));
        return [config, setConfig]
    })
}

export const generateURL = (pathname, params, reflectorHost) => {

    let genID = generateInstanceID();
    let reflector = reflectorHost ? '&r=' + reflectorHost : ""
    let urlAddon = '?k=' + genID;
    let state = {
        path: pathname + urlAddon
    }
    console.log(genID);
    //setSearchParams(genID);
    setTimeout(()=>{
        window.history.replaceState(state, params, window.location.origin + window.location.pathname + urlAddon + reflector);
    },0)

    return genID
}

export const getSeloByID = (id) => {

    return seloDatas[id]
}

export const createLinkForSelo = (selo) => {

    let refHost = selo.reflectorHost ? '&r=' + selo.reflectorHost : ""
    let link = window.location.origin + '/' + selo.app + '?k=' + selo.id + refHost
    return link
}


export const createQRCode = (div, link) => {

    //let link = window.location.origin + '/' + selo.app + '?k=' + selo.id

    return QrCreator.render({
        text: link, //props.selo.id,
        radius: 0.5, // 0.0 to 0.5
        ecLevel: 'H', // L, M, Q, H
        fill: '#4F4F4F',//'#536DFE', // foreground color
        background: null, // color or null for transparent
        size: 64 // in pixels
    }, div);

}

export const getWorldConfig = async (props, setConfig, file) => {
    //TODO: db storage

    props.selo.vTime ? props.selo.vTime.suspend() : props.rootSelo.vTime.suspend()

    let defaultConfig = {
        defaultAvatar: props.defaultAvatar ? props.defaultAvatar : true,
        defaultContent: props.defaultContent ? props.defaultContent : true
    }

    file ? setConfig(JSON.parse(file)) : setConfig(defaultConfig)
    props.selo.vTime ? props.selo.vTime.resume() : props.rootSelo.vTime.resume()

}

export const disconnectSelo = (selo) => {

    let seloID = selo.id
    if (seloID) {
        let clientSeloID = selo.clientSeloID
        console.log("Disconnected: ", seloID)
        if (selos[seloID]) {
            Object.keys(selos[seloID]).forEach(key => {
                if (key == clientSeloID) {
                    selos[seloID][key]?.disconnect()
                    selos[seloID][key] = undefined
                    delete selos[seloID][key]
                }
            })
        }
        //selos[props.seloID]?.disconnect()
        if (Object.keys(selos[seloID]).length == 0) {
            selos[seloID] = undefined
            if (seloDatas[seloID]) seloDatas[seloID] = undefined
        }

    }
}

export const addLocalSelo = (rootSelo, localSeloID) => {

    const fun = () => {

        let rootSeloID = rootSelo.storeNode.configuration.seloID;

        rootSelo.setStoreNode(produce((s) => {
            if (!s.localSelos[rootSeloID])
                s.localSelos[rootSeloID] = {}

            if (!s.localSelos[rootSeloID][localSeloID])
                s.localSelos[rootSeloID][localSeloID] = initSelo(localSeloID, rootSelo)
        }))

        return rootSelo.storeNode.localSelos[rootSeloID][localSeloID] //localSelo
    }
    return createRoot(fun)
}

export const showState = (owner) => {
    console.log(getGraph(owner))
}

export const initSelo = (seloID, root) => {

    let owner = getOwner();
    const randomGen = { prng: {} }

    const [storeNode, setStoreNode] = createStore({
        clients: [],
        configuration: {
            randomseed: +new Date,
            seloID: seloID
        },
        localStores: {},
        storesRefs: {},
        localSelos: {}
    });

    const [storeVT, setStoreVT] = createStore({
        socketMsg: null,
        extMsg: null,
        intMsg: null,
        appState: null,
        reflectorMsg: null,
        syncSig: null,
        syncData: null,
        moniker_: null,
        rapierWorld: null,
        stateSynced: false,
        syncReady: [],
        stateNodes: [],
        getStateSignal: null
        //owner: storeOwner
    });

    if (root) {
        createEffect(() => {
            if (root.storeNode.tick) {
                setStoreNode("tick", root.storeNode.tick)
            }
        })
    }

    let rSelo = root?.setStoreVT ? root?.setStoreVT : setStoreVT

    const future = function (nodeID, msgName, when, value) {

        if (!when || when == 0)
            return callAction(nodeID, msgName, [value])

        queueMicrotask(() => {
            sendFuture({
                msg: msgName,
                id: nodeID,
                when: when ? when : 0,
                params: value ? value : 0
            })
        })

    }

    const sendExtMsg = (obj) => {

        rSelo(produce((s) => {
            s.extMsg = {
                seloID: seloID,
                name: obj.msg,
                nodeID: obj.id,
                value: obj.params,
                when: 0
            }
        }))
    }

    const sendFuture = (obj) => {

        rSelo(produce((s) => {
            s.intMsg = {
                name: obj.msg,
                value: obj.params,
                when: -1 * obj.when,
                nodeID: obj.id
            }
        }))

    }


    const random = () => {
        return root ? root.randomGen.prng() : randomGen.prng()
        // return randomGen.prng()
    }

    const getNodeByID = (id) => {
        if (storeNode.storesRefs)
            return storeNode.storesRefs[id]?.local
    }

    const getSetNodeByID = (id) => {
        if (storeNode.storesRefs)
            return storeNode.storesRefs[id]?.setLocal
    }

    const shortRandomID = () => {
        return random().toString(36).substr(2, 9);
    }

    const randomInt = (leftLimit, rightLimit) => {
        return leftLimit + (random() * (rightLimit - leftLimit))
    }

    const randomID = () => {

        var S4 = function () {
            return Math.floor(
                random() * 0x10000 /* 65536 */
            ).toString(16);
        };

        return (
            S4() + S4() + "-" +
            S4() + "-" +
            S4() + "-" +
            S4() + "-" +
            S4() + S4() + S4()
        );
    }

    const callActionNode = (node, actionName, params) => {

        if (node && node.setActions[actionName]) {
            node.setActions[actionName](params)
        } else {
            node.setActions["doesNotUnderstand"]({ action: actionName, params: params })
        }
    }

    const callAction = (id, actionName, params) => {

        let node = getNodeByID(id)
        if (node) {
            if (node.setActions[actionName]) {
                node.setActions[actionName](params)
            } else {
                node.setActions["doesNotUnderstand"]({ action: actionName, params: params })
            }
        }
    }

    const createAction = (id, actionName, actionFunction, replace) => {

        let node = getNodeByID(id)
        let setNode = getSetNodeByID(id)

        if (!node?.actions[actionName] || replace) {
            setNode(produce((s) => {
                let [sig, setSig] = createSignal([])
                s.actions[actionName] = sig
                s.setActions[actionName] = setSig
//, { equals: false }
            }))

            createEffect(on(node.actions[actionName], (params) => {
                queueMicrotask(() => {
                    actionFunction(params)
                })

            }, { defer: true }));

        }
    }


    const seloData = {
        storeNode: storeNode,
        setStoreNode: setStoreNode,
        randomGen: root ? root.randomGen : randomGen,
        storeVT: root ? root.storeVT : storeVT,
        setStoreVT: root ? root.setStoreVT : setStoreVT,
        //setLocalRefs: setLocalRefs,
        sendExtMsg: sendExtMsg,
        random: random,
        future: future,
        getNodeByID: getNodeByID,
        getSetNodeByID: getSetNodeByID,
        addLocalSelo: addLocalSelo,
        id: seloID,
        createAction: createAction,
        callAction: callAction,
        callActionNode: callActionNode,
        shortRandomID: shortRandomID,
        randomID: randomID,
        randomInt: randomInt
        // owner: owner
    }

    return seloData

}

export const initRootSelo = (seloID, app, reflectorHost, parentSeloID) => {


    const connObj = { "loadInfo": {}, "path": { "application": "index", "instance": seloID, "public_path": '/' + app, "name": app }, "user": "w" };

    console.log('SeloID: ', seloID)

    const seloData = {
        ...initSelo(seloID),
        owner: getOwner(),
        app: app,
        parentSeloID: parentSeloID ? parentSeloID : null
        //reflectorHost: reflectorHost
    }

    const connection = connect(connObj, seloID, seloData, reflectorHost)
    const vTime = initTime(connection.socket, seloID, seloData)

    seloData.reflectorHost = connection.socket.io.uri

    console.log("Connection: ", connection)
    console.log("VirtualTime: ", vTime)

    //Store selos in global dict
    selos[seloID] ? selos[seloID] : selos[seloID] = {} //= connection

    let clientSeloID = uuidv4();
    seloData.clientSeloID = clientSeloID
    selos[seloID][clientSeloID] = connection



    createEffect(() => {
        seloData.randomGen.prng = new Alea(seloData.storeNode.configuration.randomseed)
        console.log("Create prng for: ", seloData.storeNode.configuration.randomseed);
    })


    createEffect(() => {
        let msg = seloData.storeVT.reflectorMsg;
        if (msg && !msg.nodeID) {
            dispatchApp(msg, seloID, seloData);
        }

    });

    createEffect(() => {

        if (seloData.storeVT.syncReady.length !== 0 
            && seloData.storeVT.syncReady.length == seloData.storeVT.stateNodes.length) {
            console.log("Syncing is finsished!: ", seloData.storeVT.syncReady)
            seloData.vTime.finishSync()
            seloData.setStoreVT("stateSynced", true)
        }

    })

    createEffect(() => {

        let state = seloData.storeVT.appState//appState;

        if (state) {
  
            console.log("Set state: ", state);

            let ob = JSON.parse(state[0]);
            seloData.setStoreVT("stateNodes", Object.keys(ob.localStores))
            console.log("State is: ", ob)
            // setStoreNode(key)('nodes', reconcile(ob.nodes));
            seloData.setStoreNode('clients', reconcile(ob.clients));
            seloData.setStoreNode('localStores', reconcile(ob.localStores));
            seloData.setStoreVT("syncData", true)

            let localSt = state[1]
            if (Object.keys(localSt).length !== 0) {

                Object.keys(localSt).forEach(key => {

                    let newState = JSON.parse(localSt[key]);
                    seloData.setStoreVT(produce(s => {
                        let newNodes = s.stateNodes.concat(Object.keys(newState.localStores));
                        s.stateNodes = newNodes
                    }))

                    seloData.storeNode.localSelos[seloID][key].setStoreNode('clients', reconcile(newState.clients));
                    seloData.storeNode.localSelos[seloID][key].setStoreNode('localStores', reconcile(newState.localStores));
                    seloData.storeNode.localSelos[seloID][key].setStoreVT("syncData", true)

                })
            }
            seloData.setStoreVT("appState", null)
        }
    })

    if (!seloDatas[seloID]) 
        seloDatas[seloID] = seloData

    return seloData

}

export const genID = (id, url) => {
    const myPath = (new URL(url)).pathname;
    return uuidv5(myPath + id, uuidv5.URL);
}

export const getRandomColor = (selo) => {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(selo.random() * 16)];
    }
    return color;
}

const dispatchApp = function (msg, id, selo) {

    if (!msg.nodeID) {

        if (msg.actionName == "createNode" && msg.parameters[0] == "proxy/clients.vwf") {
            console.log("create clients list")
            selo.setStoreNode("clients", [])
        }

        if (msg.actionName == "createNode" && msg.parameters[1] == "application") {
            console.log("create app")
            selo.setStoreVT("stateSynced", true)
        }

        if (msg.actionName == "createChild" && msg.parameters[0] == "proxy/clients.vwf") {
            console.log("add client: ", msg.parameters[1])

            setTimeout(() => {
                selo.setStoreNode(
                    produce((s) => {
                        let clientID = msg.parameters[1]
                        //if(!s.clients.includes(clientID))
                        s.clients.push(clientID);
                    })
                )
            }, 0)

        }

        if (msg.actionName == "deleteChild" && msg.parameters[0] == "proxy/clients.vwf") {
            console.log("delete client");

            selo.setStoreNode(
                produce((s) => {
                    let clientID = msg.parameters[1];
                    let index = s.clients.indexOf(clientID);
                    s.clients.splice(index, 1);
                    s.storesRefs[clientID] = undefined
                    s.storesRefs[clientID + '_dynamic'] = undefined
                    s.localStores[clientID] = undefined
                    s.localStores[clientID + '_dynamic'] = undefined
                })
            );

        }
    }

}


export const getNodeByID = (selo, id) => {

    if (selo.storeNode.storesRefs)
        return selo.storeNode.storesRefs[id].local
}

const getNodeByName = (name) => {

    let store = Object.values(unwrap(storeNode.storesRefs)).filter(el => el.data.properties.name == name)[0];
    return getNodeByID(store.data.nodeID)
}

export const deleteSeloInstance = (data, setLocal, selo) => {

    setLocal(
        produce((s) => {
            let node = s.data.dynamicSelo.filter(el => el.nodeID == data[0])[0];
            let index = s.data.dynamicSelo.indexOf(node);
            s.data.dynamicSelo.splice(index, 1);
        }))

}

export const deleteNode = (data, setLocal, selo) => {

    setLocal(
        produce((s) => {
            let node = s.data.dynamic.filter(el => el.nodeID == data[0])[0];
            let index = s.data.dynamic.indexOf(node);
            s.data.dynamic.splice(index, 1);
        }))

    selo.setStoreNode(
        produce((s) => {
            if (s.storesRefs[data[0]])
                s.storesRefs[data[0]] = undefined
        }))      

}

export const shortRandomIDInView = function () {
    return Math.random().toString(36).substr(2, 9);
}

export const randomID = (selo) => {

    var S4 = function () {
        return Math.floor(
            selo.random() * 0x10000 /* 65536 */
        ).toString(16);
    };

    return (
        S4() + S4() + "-" +
        S4() + "-" +
        S4() + "-" +
        S4() + "-" +
        S4() + S4() + S4()
    );
}

export const createNode = (selo, setLocal, order, obj) => {
    // step on tick
    console.log("Create new Node!");

    let orderInsert = order ? order : "last"
    let newID = (obj.id && obj.id.length !== 0) ? obj.id : selo.randomID();


    let newNode = {
        component: obj.component ? obj.component : "Node",
        type: obj.type ? obj.type : "Node",
        nodeID: newID.toString(),
        name: obj.name ? obj.name : selo.shortRandomID(),
        protoID: obj.protoID ? obj.protoID : null
    }

    let objNode = Object.assign({ ...obj }, newNode)

    if (orderInsert == "first") {
        setLocal("data", "dynamic", n =>
            [objNode, ...n]);
    } else {
        setLocal("data", "dynamic", n =>
            [...n, objNode]);
    }
}

export const createLocalStore = (obj, props) => {

    let l = props.selo.getNodeByID(props.nodeID)
    let sL = props.selo.getSetNodeByID(props.nodeID)

    if (l && sL && !props.protoID) {
        console.log("Exist already: ", props.nodeID)
        return [l, sL]
    } else {
        console.log("Created new: ", props.nodeID)
        const [n, sN] = createStore(obj)
        init({
            selo: props.selo,
            local: n,
            setLocal: sN,
            nodeID: props.nodeID,
        })
        return [n, sN]
    }

}

export const initializeOnMount = (props) => {
    //do onMount
}

const initializeMountReaction = (nodeID) => {
    const [s, set] = createSignal("start");

    const track = createReaction(() => {
        console.log("Mount ", nodeID);
        sendExtMsg({ msg: "initialize", id: nodeID })
    });

    track(() => s());
    set("end");
}

const init = function (obj) {

    const l = obj.selo.getNodeByID(obj.nodeID)
    if (l)
        return


    createEffect(() => {

        let msg = obj.selo.storeVT.reflectorMsg //unwrap(obj.selo.storeVT.reflectorMsg);

        if (msg?.nodeID == obj.nodeID)
            obj.selo.callActionNode(obj.local, msg.actionName, msg.parameters)

    })


    createEffect(() => {

        if (obj.selo.storeVT.syncSig) {
            let localSt = unwrap(obj.local);
            // localSt.actions = {};
            // localSt.setActions = {};

            //Rapier serialization

            if (untrack(()=>obj.selo.storeVT.rapierWorld) && localSt.data.rapierWorldState) {
                console.log("Rapier world serialization: ", obj.selo.storeVT.rapierWorld)
                let serializeWorld = obj.selo.storeVT.rapierWorld.takeSnapshot()

                obj.setLocal(produce(s => {
                    s.data.rapierWorldState = serializeWorld
                    //localSt.rapierWorld = {}
                }))
            }

            console.log("Store child: ", obj.nodeID);
            obj.selo.setStoreNode(
                produce((s) => {
                    s.localStores[obj.nodeID] = {
                        nodeID: obj.nodeID,
                        local: localSt
                    }
                })
            );
            //obj.selo.setStoreVT("syncSig", false)
        }
    })

    createEffect(() => {
        if (obj.selo.storeVT.syncData) {
            console.log("RESTORE child: ", obj.nodeID);
            if (obj.selo.storeNode.localStores[obj.nodeID]) {
                obj.setLocal('data', reconcile(obj.selo.storeNode.localStores[obj.nodeID]?.local.data));
                obj.selo.setStoreVT(produce(s => {
                    s.syncReady.push(obj.nodeID)
                }))
            }
        }
    })

    createEffect(() => {

        if (obj.selo.storeVT.stateSynced && obj.selo.storeVT.moniker_) { 
            setTimeout(() => {
                obj.selo.future(obj.nodeID, "preInitialize", 0, obj.selo.storeVT.moniker_)
            }, 0)
        }
    })


    createEffect(() => {

        if (obj.local.data.properties.ticking && (obj.local.data.properties.initialized)) {
            if (obj.selo.storeNode.tick) {

                //setTimeout(()=>{
                queueMicrotask(() => {
                    setTimeout(() => {
                        obj.selo.future(obj.nodeID, "step", 0, obj.selo.storeNode.tick)
                        //obj.local.setActions["step"](obj.selo.storeNode.tick)
                    }, 0)
                })
            }
        }
    })

    console.log("Register ", obj.nodeID, " on Selo: ", obj.selo.storeNode.configuration.seloID);
    obj.selo.setStoreNode("storesRefs", obj.nodeID, {
        local: obj.local,
        setLocal: obj.setLocal
    });

    obj.setLocal("actions", {})
    obj.setLocal("setActions", {})

    const doesNotUnderstand = (data) => {
        console.log("doesNotUnderstand action: ", data)
    }

    const setProperty = (parameters) => {
        obj.setLocal("data", "properties", parameters[0], parameters[1])
    }

    const preInitialize = (parameters) => {
        if (!obj.local.data.properties.initialized) {
            //do initialization
            obj.setLocal("data", "properties", "initialized", true);
            obj.selo.callActionNode(obj.local, "initialize", [])
        }
        obj.selo.callActionNode(obj.local, "postInitialize", [])

    }

    obj.selo.createAction(obj.nodeID, "doesNotUnderstand", doesNotUnderstand)
    obj.selo.createAction(obj.nodeID, "setProperty", setProperty)
    obj.selo.createAction(obj.nodeID, "preInitialize", preInitialize)


    const createSelo = (data) => {

        let seloID = data[0].id ? data[0].id : obj.selo.randomID()

        let objData = { ...data[0], seloID: seloID }
        let index = data[0].index

        if (index == undefined) {
            obj.setLocal("data", "dynamicSelo", n =>
                [objData, ...n]);
        } else {
            obj.setLocal(produce(s => {

                if (s.data.dynamicSelo[index]) {
                    s.data.dynamicSelo[index] = objData
                }
                else {
                    s.data.dynamicSelo.unshift(objData)
                }
            }))
        }


    }

    const deleteSelo = (data) => {

        deleteSeloInstance(data, obj.setLocal, obj.selo)

    }

    const createDynamicNode = (data) => {
        createNode(obj.selo, obj.setLocal, "first", data[0])
    }

    const deleteDynamicNode = (data) => {
        deleteNode(data, obj.setLocal, obj.selo)
    }

    if (obj.local.data.type == "App") {

        obj.selo.createAction(obj.nodeID, "deleteNode", deleteDynamicNode)
        obj.selo.createAction(obj.nodeID, "createNode", createDynamicNode)
        obj.selo.createAction(obj.nodeID, "createSelo", createSelo)
        obj.selo.createAction(obj.nodeID, "deleteSelo", deleteSelo)

    }

}


const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return;
            }
            seen.add(value);
        }
        return value;
    };
};

export const getGraph = (owner) => {

    let devData = DEV.serializeGraph(owner);
    let data = JSON.stringify(
        devData,
        //null,
        getCircularReplacer(),
        2
    );
    return data

}

export const generateInstanceID = () => {
    var text = "";

    for (var i = 0; i < 16; i++)
        text += validIDChars.charAt(Math.floor(Math.random() * validIDChars.length));

    return text;
}

