/*
The MIT License (MIT)
Copyright (c) 2022 Nikolay Suslov and the Krestianstvo.org project contributors.
(https://github.com/NikolaySuslov/krestianstvo/blob/master/LICENSE.md)
*/

import { mergeProps,  onCleanup, onMount } from "solid-js";
import { initRootSelo, disconnectSelo} from './Krestianstvo'

export default function Selo(props) {

    let deepCount = props.deepCount ? props.deepCount - 1 : 0
    const seloData = props.deep > deepCount ? {} : 
        initRootSelo(props.seloID, props.nodeID, props.reflectorHost, props.parentSeloID)
   
    seloData.resources = props.resources

    const seloProps = mergeProps({
        deep: props.deep ? props.deep : 0,
        selo: seloData
       // nodeID: props.nodeID
    }, props)


    onCleanup(()=>{
        disconnectSelo(seloProps.selo)
    })

    onMount(()=>{
        console.log("Selo mounted: ", props.seloID)
        setTimeout(()=>{
            seloData.id ? seloData.setStoreVT("syncFromFile", true) : null
        },0)


    })

    return (seloProps.deep > deepCount) ? null : (
        <>
                <Dynamic 
                    {...seloProps}
                    deep={seloProps.deep + 1} 
                    component={props.component ? props.component: props.fallbackWorld}
                />
        </>
    )
}