#Brain Burst

A Turn-based game server in Node.js

---

**A stable version is out, please check out `master` to use.**

Still Under Development, please use `Under_Dev` branch to get latest one. (may buggy)
---

##Installation

Because `websocket` may need local extension, so please run `npm install` or `npm install websocket` to compile this.

**Updated:** IT IS HIGHLY RECOMMEND TO RUN `rm -rf node_modules` and then run `npm install` under project folder.

##Configuration

The configuration file is `configuration.js`, when doing local debug, please use `NODE_ENV=development` environment, otherwise use `NODE_ENV=depolyment`

##Run

Please use `NODE_ENV=development node app.js` or `NODE_ENV=deployment node app.js` to run this app.

If you are using `WebStorm` as IDE, maybe you could just run it by `BrainBurst` running configuration.