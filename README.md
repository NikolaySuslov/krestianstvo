# Krestianstvo | Solid JS

Krestianstvo | Solid JS - is the full-featured implementation of the **[Croquet Application Architecture](https://croquet.io)** in functional reactive paradigm, based on **[SolidJS](https://www.solidjs.com)**. It uses just signals and reactive computations. It's Virtual Time and Reflector are based on **[Virtual World Framework's](https://github.com/virtual-world-framework/vwf)** implementation.
Krestianstvo is minimal and distributed as a standalone ESM JavaScript module to be bundled within **[SolidJS](https://www.solidjs.com)** and **[Astro](https://astro.build)** web applications.

Demos and examples can be found in **[Krestianstvo | Playground](https://github.com/NikolaySuslov/krestianstvo-playground)**

## Live Demo

**https://play.krestianstvo.org**  

## Develop 

1. Clone and run Krestianstvo | Core

git clone **https://github.com/NikolaySuslov/krestianstvo**  
npm install  
npm run dev  

By default Vite will start the development server: http://localhost:5173  
Copy this link to Web browser

2. Run local Reflector server or connect to the public one

Public running reflector server address: **https://time.krestianstvo.org**

Run your local server:  

git clone **https://github.com/NikolaySuslov/lcs-reflector**  
npm install  
npm run start 

By default Reflector server will start at: http://localhost:3001  


## Build and deploy

The project is using Vite for bundling the Krestianstvo library

npm run build


## Contributing

All code is published under the MIT license