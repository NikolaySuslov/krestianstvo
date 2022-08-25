/*
The MIT License (MIT)
Copyright (c) 2022 Nikolay Suslov and the Krestianstvo.org project contributors.
(https://github.com/NikolaySuslov/krestianstvo/blob/master/LICENSE.md)
*/

import { createLocalStore, getRandomColor } from '../Krestianstvo'
import SeloInfo from "./Info"


export default function Play(props) {

	const [local, setLocal] = createLocalStore({
		data: {
			type: "Node",
			nodeID: props.nodeID,
			properties: {
				name: props.name ? props.name : props.nodeID,
				count: 0,
				tick: 0,
				color: "#fff",
				ticking: false,
				initialized: false,
				dynamic: props.dynamic ? props.dynamic : false,
				parentID: props.parentID ? props.parentID : null
			},
			dynamic: [
			]
		}
	}, props);

	const step = (tick) => {
		// step on tick
	}

	const inc = () => {
		setLocal("data", "properties", "tick", props.selo.storeNode.tick)
		setLocal("data", "properties", "count", (c) => c + 1)
		setLocal("data", "properties", "color", getRandomColor(props.selo))

		props.selo.future(props.nodeID, "inc", 1)
	}

	const initialize = () => {
			inc()
	}

	props.selo.createAction(props.nodeID, "inc", inc)
	props.selo.createAction(props.nodeID, "initialize", initialize)

	return (
		<>
		<div style={{
			 display: "grid",
			 "grid-template-columns": "repeat(2, 300px)",
			 gap: "10px"
		}}>
			<div>
			 <Show when={props.info}>
              <SeloInfo
                {...props}
              />
            </Show>
			</div>
			<div style={{
					opacity: 0.8,
					background: local.data.properties.color,
					width: "fit-content",
					height: "fit-content"
				}}>
			<div style={{background: "rgba(255,255,255, 0.4)"}}>
				<pre>Tick: {local.data.properties.tick?.toPrecision(4)}</pre>	
				<pre>Count: {local.data.properties.count}</pre>
				<pre>Color: {local.data.properties.color}</pre>	
				</div>	
			</div>
			</div>
		</>
	)
}
