/*
The MIT License (MIT)
Copyright (c) 2022 Nikolay Suslov and the Krestianstvo.org project contributors. 
(https://github.com/NikolaySuslov/krestianstvo/blob/master/LICENSE.md)

Virtual World Framework Apache 2.0 license  
(https://github.com/NikolaySuslov/livecodingspace/blob/master/licenses/LICENSE_VWF.md)
*/

import { produce } from "solid-js/store";
import { io } from "socket.io-client";

    const connections = {}

    export const connect = function (path, storeID, seloData, hostURL) {

        const connection = {
            socket: null
        }
        
        try {

            let objToRef = path ? path : { "loadInfo": {}, "path": { "application": "index.vwf", "instance": "O4t2lsAgzKtJoxkH", "public_path": "/empty" }, "user": "w" }

            const globalConfig = localStorage.getItem("krestianstvo");
            const conf = globalConfig ? JSON.parse(globalConfig) : {
                defaultReflectorHost : 'https://localhost:3001' 
                //'https://time.livecoding.space'
            }

            const options = {

                query: {
                    pathname: "w",
                    //window.location.pathname.slice( 1,window.location.pathname.lastIndexOf("/") ),
                    appRoot: "./public",
                    path: JSON.stringify(objToRef)//JSON.stringify(path)
                },

                // Use a secure connection when the application comes from https.

                secure: window.location.protocol === "https:",

                // Don't attempt to reestablish lost connections. The client reloads after a
                // disconnection to recreate the application from scratch.

                //reconnect: false,
                reconnection: false,
                upgrade: false,
                transports: ['websocket']

            };

            const host = hostURL ? hostURL : conf.defaultReflectorHost  
            connection.socket = io.connect(host, options) 

        } catch (e) {}


            if (connection.socket) {

                connection.socket.on('connect_error', function (err) {
                    console.log(err);
                    var errDiv = document.createElement("div");
                    errDiv.innerHTML = "<div class='vwf-err' style='z-index: 10; position: absolute; top: 80px; right: 50px'>Connection error!" + err + "</div>";
                    document.querySelector('body').appendChild(errDiv);
    
                });
    
                connection.socket.on("connect", () => {
    
                    console.log("-socket", "connected")
    
                    seloData.setStoreVT(produce((s) => {
                        s.moniker_ = connection.socket.id
                    }))

                });
    
                connection.socket.on("message", (message) => {
                    try {
    
                        var fields = message;

                        fields.time = Number(fields.time);
                        fields.origin = "reflector";
    
                        // Update the queue.  Messages in the queue are ordered by time, then by order of arrival.
                        // Time is only advanced if the message has no action, meaning it is a tick.

                        seloData.setStoreVT(produce((s) => {
                            s.socketMsg = [fields, !fields.action]
                        }))

                        // Each message from the server allows us to move time forward. Parse the
                        // timestamp from the message and call dispatch() to execute all queued
                        // actions through that time, including the message just received.
    
                        // The simulation may perform immediate actions at the current time or it
                        // may post actions to the queue to be performed in the future. But we only
                        // move time forward for items arriving in the queue from the reflector.
    
                    } catch (e) {
                        console.log(fields.action, fields.node, fields.member, fields.parameters,
                            "exception performing action: ", e)
                    }
    
                });
    
                connection.socket.on("disconnect", function () {
                    console.log("-socket", "disconnected")
                });
    
                connection.socket.on("error", function () {
                    document.querySelector('body').innerHTML = "<div class='vwf-err'>WebSockets connections are currently being blocked. Please check your proxy server settings.</div>";
                });
            }
        
            connection.disconnect = function () {
                console.log("Disconnecting...")
                connection.socket?.disconnect();
            }

            connections[storeID] = connection
            return connection
        }
