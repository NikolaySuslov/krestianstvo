# Krestianstvo SDK 4 | Solid JS

![image](https://github.com/NikolaySuslov/krestianstvo-playground/raw/main/public/sdk4.jpg)

**Krestianstvo SDK 4** is the Open Source implementation of the **[Croquet](https://en.wikipedia.org/wiki/Croquet_OS)** application architecture in **Functional Reactive Paradigm**.

## Live Demo

**https://play.krestianstvo.org**  


## Documentation

**https://docs.krestianstvo.org**  


Krestianstvo SDK 4 is mainly developed using **[Solid JS](https://www.solidjs.com)** with the prototype in [S.JS](https://github.com/NikolaySuslov/krestianstvo-s.js). Other implementations are also underway for Rust, Swift and Squeak Smalltalk programming languages.

The applications built with Krestianstvo SDK 4 are using just Signals, Effects and reactive computations to get the original scene of Croquet's Objects with Message passing but implemented in Functional Reactive Paradigm (FRP).

Virtual Time and Reflector are based on **[Virtual World Framework's](https://github.com/virtual-world-framework/vwf)** implementation, modified to suit FRP. Support for running applications built with SDK in peer-to-peer Web, mesh and decentralised networks even without Reflector server is underway, by using [Krestianstvo Luminary](https://github.com/NikolaySuslov/luminary).

Krestianstvo SDK 4 - is minimal and distributed as a standalone ESM JavaScript module to be bundled within any **[Solid JS](https://www.solidjs.com)** or **[Astro](https://astro.build)** web applications.

Getting all the benefits from Functional Reactive Paradigm (FRP), **Krestianstvo SDK 4** become just an ideal framework for developing and deploying multi-user, collaborative serverless apps with ease. It is brining closer to the realisation the ideas about an End-User Mobile Web XR Virtual Learning Environment founded in the previous versions of [Krestianstvo SDK](https://www.krestianstvo.org).

##### Croquet FRP implementations founded in SDK 4

| | Language | FRP library | Status | |
|---------------------|------------|-------------|--------------------|---|
| [krestianstvo](https://github.com/NikolaySuslov/krestianstvo) | JavaScript | Solid JS | active development | |
| [krestianstvo-s.js](https://github.com/NikolaySuslov/krestianstvo-s.js) | JavaScript | S.js | prototype | |
| [krestianstvo-electric](https://github.com/NikolaySuslov/krestianstvo-electric) | Clojure | Electric | prototype | |
| [krestianstvo-rust](https://github.com/NikolaySuslov/krestianstvo-rust) | Rust | Leptos | in work | |
| [krestianstvo-swift](https://github.com/NikolaySuslov/krestianstvo-swift) | Swift | Bow-Swift | future work | |
| [krestianstvo-squeak](https://github.com/NikolaySuslov/krestianstvo-squeak) | Smalltalk | S.Squeak | future work | |


## Develop Applications

```js
npm install krestianstvo --save
```
[CodeSandbox demo project](https://codesandbox.io/s/krestianstvo-helloworld-pnimfu)

or

Clone and run Krestianstvo | Core

```js
git clone https://github.com/NikolaySuslov/krestianstvo 
npm install  
npm run dev  
```

By default Vite will start the development server: http://localhost:5173  
Copy this link to Web browser.

You need to run local Reflector server or connect to the public one.  
Public running reflector server address: **https://time.krestianstvo.org**

Run your local server 

```js
git clone https://github.com/NikolaySuslov/lcs-reflector 
npm install  
npm run start 
```

By default Reflector server will start at: http://localhost:3001  


## Build and deploy

The project is using Vite for bundling the Krestianstvo library

```js
npm run build  
npm run serve
```

[Glitch demo bundled project with Reflector](https://krestianstvo-playground.glitch.me)

## Contributing

All code is published under the MIT license