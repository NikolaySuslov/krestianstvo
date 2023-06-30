/*
The MIT License (MIT)
Copyright (c) 2022 Nikolay Suslov and the Krestianstvo.org project contributors.
(https://github.com/NikolaySuslov/krestianstvo/blob/master/LICENSE.md)
*/

import { createSignal, createEffect, createMemo, createRoot, getOwner, createReaction, on, DEV, untrack, onCleanup, batch } from "solid-js";
import { createStore, reconcile, produce, unwrap } from "solid-js/store";
import { connect } from './ReflectorClient'

import { createId } from '@paralleldrive/cuid2'
import { v5 as uuidv5 } from 'uuid';
import { initTime } from './VirtualTime'
import Alea from 'alea/alea.js'
import QrCreator from 'qr-creator';

import { where, maybe, optic, values } from 'optics.js/index'
//import * as R from 'rambda'

const selos = {}
const seloDatas = {}
const allSaved = {}

export const restoreFromFile = (storeID, data, restoreSeloID) => {
    let seloData = getSeloByID(storeID)
    const state = data

    if (state) {

        console.log("Set state: ", state);

        if (restoreSeloID) {
            seloData.setStoreVT("rootNode", restoreSeloID)
        }
        let ob = state;
        seloData.setStoreVT("stateNodes", Object.keys(ob.localStores))
        console.log("State is: ", ob)
        // setStoreNode(key)('nodes', reconcile(ob.nodes));
        //seloData.setStoreNode('clients', reconcile(ob.clients));

        seloData.setStoreNode('restoreDATA', reconcile(ob.localStores))
        seloData.setStoreVT("syncDataFile", true)


        let localSt = state.storesState
        if (Object.keys(localSt).length !== 0) {

            Object.keys(localSt).forEach(key => {

                let newState = JSON.parse(localSt[key]);
                seloData.setStoreVT(produce(s => {
                    let newNodes = s.stateNodes.concat(Object.keys(newState.localStores));
                    s.stateNodes = newNodes
                }))

                //seloData.storeNode.localSelos[seloID][key].setStoreNode('clients', reconcile(newState.clients));
                seloData.storeNode.localSelos[seloID][key].setStoreNode('restoreDATA', reconcile(newState.localStores));
                seloData.storeNode.localSelos[seloID][key].setStoreVT("syncDataFile", true)

            })
        }
        //seloData.setStoreVT("appState", null)
    }

}

export const restoreFull = (data, rootID, restoreSeloID) => {

    //const stateData = localStorage.getItem("dataFull")
    const states = JSON.parse(data)

    restoreFromFile(rootID, states.root.root, restoreSeloID)

    Object.entries(states.all).forEach(st => {
        allSaved[st[0]] = { restoreSeloID: restoreSeloID, state: st[1] }
    })

}

const replaceSeloIDinState = (r, newMap) => {

    newMap.forEach(n => {
        const o = optic(values, 'local', 'data', 'properties', maybe('url'))
            .over(x => x.includes(n.id) ? x.replace(n.id, n.newID) : x, r.st)
        r.st = o
    })

    newMap.forEach(n => {
        const o = optic(values, 'local', 'data',
            optic(maybe('dynamicSelo'), optic(values)),
            optic("seloID"))
            .over(x => x == n.id ? x = n.newID : x, r.st)
        r.st = o
    })

}

export const replaceURLs = (states) => {

    let newMap = []
    let rootID = createId();
    newMap.push({ id: states.root.root.id, newID: rootID })

    Object.values(states.all).forEach(el => {
        let newID = createId();
        newMap.push({ id: el.id, newID: newID })
    })
    console.log(newMap);


    let allSelos = Object.values(states.root).concat(Object.values(states.all))

    let allNew = {
        root: {
            // id: rootID,
            // localStores: robj,
            // storesState: states.root.storesState
        },
        all: {}
    }

    allSelos.forEach(el => {

        let a = { st: Object.values(el.localStores) }
        replaceSeloIDinState(a, newMap)

        let myID = newMap.filter(k => k.id == el.id)[0].newID

        let aobj = {}
        a.st.forEach(el => { aobj[el.nodeID] = el })

        if (myID == rootID) {
            allNew.root["root"] = {
                id: myID,
                localStores: aobj,
                storesState: el.storesState
            }
        } else {
            allNew.all[myID] = {
                id: myID,
                localStores: aobj,
                storesState: el.storesState
            }
        }
    })

    console.log(allNew)
    return allNew

}

export const saveFull = (rootID, setFile) => {

    const all = {}
    let root = saveToFile(rootID)

    Object.entries(seloDatas).forEach(el => {
        //console.log(el)
        if (el[0] !== rootID && el[1]) {
            let save = saveToFile(el[0])
            all[el[0]] = save
        }
    })

    let file = {
        root: { "root": root },
        all: all
    }
    console.log("All:", file)
    // localStorage.setItem("dataFull", JSON.stringify(
    //     file
    // ))

    setFile(file)

}

export const saveToFile = (storeID) => {

    let selo = getSeloByID(storeID)
    console.log("My current Selo: ", selo)

    selo.setStoreNode("localStores", {})

    selo.setStoreVT("syncSig", true);

    if (selo.storeNode.localSelos[storeID]) {
        Object.keys(selo.storeNode.localSelos[storeID]).forEach(key => {
            selo.storeNode.localSelos[storeID][key].setStoreVT("syncSig", true);
        })
    }

    let res = getState(selo.storeNode, storeID) //getGraph(owner);
    console.log(res);

    return res

}

const getState = (storeNode, storeID) => {

    const storesState = {}

    if (storeNode.localSelos[storeID]) {
        Object.keys(storeNode.localSelos[storeID]).forEach(key => {
            storesState[key] = storeNode.localSelos[storeID][key].storeNode
            // JSON.stringify(
            //     storeNode.localSelos[storeID][key].storeNode,
            //     null,
            //     //getCircularReplacer(),
            //     2
            // )
        })
    }

    let loc = Object.assign({}, unwrap(storeNode.localStores))
    // storeNode.clients.forEach(el => {
    //     loc[el] = undefined
    //     delete loc[el]
    // })

    Object.entries(loc).forEach(el => {
        storeNode.clients.forEach(cl => {
            if (el[0].includes(cl)) {
                loc[el[0]] = undefined
                delete loc[el[0]]
            }
        })
    })

    const o = optic(values, 'local', 'data',
        'properties', 'initialized');
    const newloc = o.over(x => false, Object.values(loc))

    const newMap = {}
    newloc.forEach(el => {
        newMap[el.nodeID] = el
    })

    console.log("initialized", newMap)

    let obj = {
        "localStores": newMap
    }

    return {
        id: storeID,
        localStores: obj.localStores,
        storesState: storesState
    } 

}

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

export const generateURL = (pathname, params, reflectorHost, parameters, urlSource) => {

    let genID = generateInstanceID();
    let reflector = reflectorHost ? '&r=' + reflectorHost : ""
    let parametersString = parameters ? '&p=' + parameters : ""
    let urlSourceString = urlSource ? '&url=' + urlSource : ""
    let urlAddon = '?k=' + genID;
    let state = {
        path: pathname + urlAddon
    }
    console.log(genID);
    //setSearchParams(genID);
    setTimeout(() => {
        window.history.replaceState(state, params, window.location.origin + window.location.pathname + urlAddon + reflector + parametersString + urlSourceString);
    }, 0)

    return genID
}

export const getSeloByID = (id) => {

    return seloDatas[id]
}

export const createLinkForSelo = (selo, params) => {

    let refHost = selo.reflectorHost ? '&r=' + selo.reflectorHost : ""
    let sp = params?.p ? '&p=' + params.p : ""
    let sd = params?.d ? '&d=' + params.d : ""
    let su = params?.u ? '&url=' + params.u : ""
    let link =
        window.location.origin + '/' + selo.app + //+ window.location.search
        '?k=' + selo.id + refHost + sp + sd + su
    return link
}


export const createQRCode = (div, link) => {

    //let link = window.location.origin + '/' + selo.app + '?k=' + selo.id

    return QrCreator.render({
        text: link, //props.selo.id,
        radius: 0, // 0.0 to 0.5
        ecLevel: 'Q', // L, M, Q, H
        fill: '#171717',//'#536DFE', // foreground color
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
            if (seloDatas[seloID]) {
                seloDatas[seloID] = undefined
                delete seloDatas[seloID]
            }
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
        syncDataFile: null,
        syncFromFile: null,
        moniker_: null,
        rapierWorlds: {},
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
        return uuidv5(random().toString(), uuidv5.URL);
    }

    const callActionNode = (node, actionName, params) => {

        if (node && node.setActions[actionName]) {
            node.setActions[actionName](params)
        } else {
            if (!node.setActions["doesNotUnderstand"]) {
                console.log("ERR: ", node)
            } else {
                node.setActions["doesNotUnderstand"]({ action: actionName, params: params })
            }

        }
    }

    const callAction = (id, actionName, params) => {

        let node = getNodeByID(id)
        if (node) {
            if (node.setActions[actionName]) {
                node.setActions[actionName](params)
            } else {
                if (!node.setActions["doesNotUnderstand"]) {
                    console.log("ERR: ", node)
                } else {
                    node.setActions["doesNotUnderstand"]({ action: actionName, params: params })
                }
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
    const vTime = initTime(connection, seloID, seloData)

    seloData.reflectorHost = connection.host
    seloData.wsState = connection.state

    console.log("Connection: ", connection)
    console.log("VirtualTime: ", vTime)

    //Store selos in global dict
    selos[seloID] ? selos[seloID] : selos[seloID] = {} //= connection

    let clientSeloID = createId();;
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
        let sync = seloData.storeVT.syncFromFile;
        if (sync) {
            let data = allSaved[seloID]
            console.log("SYNC from File: ", sync, ' data ', data);

            if (data) {
                restoreFromFile(seloID, data.state, data.restoreSeloID)
                allSaved[seloID] = null
                delete allSaved[seloID]
            }
        }
    });

    createEffect(() => {

        if (seloData.storeVT.syncReady.length !== 0
            && seloData.storeVT.syncReady.length == seloData.storeVT.stateNodes.length) {
            console.log("Syncing is finsished!: ", seloData.storeVT.syncReady)
            if (seloData.storeVT.syncDataFile !== true) {
                seloData.vTime.finishSync()
                seloData.setStoreVT("stateSynced", true)
            } else {
                console.log("Syncing from FILE is finished!")
                let restoreSeloID = seloData.storeVT.rootNode
                let parentSelo = seloDatas[restoreSeloID ? restoreSeloID : seloData.parentSeloID]
                if (parentSelo) {
                    parentSelo.setStoreVT("syncDataFile", { status: "done", client: parentSelo.storeVT.moniker_ })
                }

            }
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
                        if(!s.clients.includes(clientID))
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

    /// TODO
    let id = data[0]

    let storeValues = Object.values(unwrap(selo.storeNode.storesRefs))

    const dynamic = optic(values, 'local', 'data', 'dynamic').toArray(storeValues)[0]
    const clones = optic(values, where({ cloneID: id }), 'nodeID').toArray(dynamic)
    console.log("find clones: ", clones)

    const meClone = optic(values, where({ nodeID: id }), 'cloneID').toArray(dynamic)
    const meClones = optic(values, where({ cloneID: meClone[0] }), 'nodeID').toArray(dynamic)
    console.log("find me clones: ", meClones)

    setLocal(
        produce((s) => {
            if (s.data.dynamic) {
                let node = s.data.dynamic.filter(el => el.nodeID == data[0])[0];
                if (node) {
                    let index = s.data.dynamic.indexOf(node);
                    s.data.dynamic.splice(index, 1)
                }
            }
        }))


    if (meClone.length == 1 && typeof meClone[0] !== "symbol" && meClones.length == 1) {
        let sL = selo.getSetNodeByID(meClone[0])

        if (dynamic.filter(el => meClone[0].includes(el.nodeID)).length == 0)
            deleteNode([meClone[0]], sL, selo)
    }


    if (clones.length > 0) {

        console.log("clones ", clones)

        clones.forEach(el => {

            console.log("clone ", el, ' for ', data[0])

            let nc = selo.getNodeByID(el)
            if (nc) {
                let sL = selo.getSetNodeByID(nc.data.properties.parentID)
                if (el !== data[0]) {
                    deleteNode([el], sL, selo)
                }
            }
        })
    }

    //if(!clones.includes(data[0]))

    if (clones.length == 0) {
        selo.setStoreNode(
            produce((s) => {
                if (s.storesRefs[data[0]])
                    s.storesRefs[data[0]] = undefined
            }))

        selo.setStoreNode(
            produce((s) => {
                if (s.localStores[data[0]])
                    s.localStores[data[0]] = undefined
            }))
    }

}

export const shortRandomIDInView = function () {
    return Math.random().toString(36).substr(2, 9);
}

export const randomID = (selo) => {
    return uuidv5(selo.random().toString(), uuidv5.URL);
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

        let component = {
            selo: props.selo,
            local: n,
            setLocal: sN,
            nodeID: props.nodeID,
        }
        init(component)
        return [n, sN, component]
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
            if(obj.internals.prng)
                localSt.data.random = obj.internals.prng.exportState()

            //Rapier serialization

            let world = untrack(() => obj.selo.storeVT.rapierWorlds[localSt.data.nodeID])
            if (world && localSt.data.rapierWorldState) {
                console.log("Rapier world serialization: ", world)
                let serializeWorld = world.takeSnapshot()

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
        if (obj.selo.storeVT.syncDataFile && !obj.selo.storeVT.syncDataFile.status) {
            console.log("RESTORE child: ", obj.nodeID);
            if (obj.selo.storeNode.restoreDATA[obj.nodeID]) {
                obj.setLocal('data', reconcile(obj.selo.storeNode.restoreDATA[obj.nodeID]?.local.data));
                obj.selo.setStoreVT(produce(s => {
                    s.syncReady.push(obj.nodeID)
                }))
            }
        }
    })

    createEffect(() => {
        if (obj.selo.storeVT.syncData) {
            if (obj.selo.storeNode.localStores[obj.nodeID]) {
                obj.setLocal('data', reconcile(obj.selo.storeNode.localStores[obj.nodeID]?.local.data));
                console.log("RESTORE child: ", obj.local.data);
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

    obj.internals = {}
    let seed = obj.selo.storeNode.configuration.randomseed + obj.nodeID
    obj.setLocal("data", "random", seed)

    createEffect(() => {
        let randomState = obj.local.data.random
        if (randomState) {
            let prng = obj.internals.prng
            if (prng) {
                obj.internals.prng.importState(randomState)
            } else {
                const newPrng = new Alea(randomState)
                if(randomState instanceof Array){
                    newPrng.importState(randomState)
                } 
                obj.internals.prng = newPrng
            }
        }
    })


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

    obj.random = () => {
        let rand = obj.internals.prng()
        //console.log("Random: ", rand)
        return rand
    }
    
    obj.future = (msgName, when, value) => {
        obj.selo.future(obj.nodeID, msgName, when, value)
    }

    obj.selo.createAction(obj.nodeID, "doesNotUnderstand", doesNotUnderstand)
    obj.selo.createAction(obj.nodeID, "setProperty", setProperty)
    obj.selo.createAction(obj.nodeID, "preInitialize", preInitialize)
    obj.selo.createAction(obj.nodeID, "random", obj.random)

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
        createNode(obj.selo, obj.setLocal, "last", data[0])
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

    // Cleanup Nodes
    onCleanup(() => {
        console.log("Delete Node: ", obj.nodeID)
        //if(obj.local.data.component !== "AppCreator" && obj.local.data.component !== "Portal")
        deleteNode([obj.nodeID], obj.setLocal, obj.selo)
    });


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

    let devData = DEV.serializeGraph(owner) //DEV.serializeGraph(owner);
    let data = JSON.stringify(
        devData,
        //null,
        getCircularReplacer(),
        2
    );
    return data

}

export const generateInstanceID = () => {
    return createId()
}

