const https = require("https");
const websocket = require("ws");
const mysql = require("mysql");
const cache = new Map();

let SECRET_KEY = "***REMOVED***";

const httpsServer = https.createServer({});

const ws = new websocket.Server({
    server: httpsServer,
    port: 8880
});

let database = mysql.createPool({
    host: "localhost",
    user: "site_xsuite",
    password: "***REMOVED***",
    database: "xsuite_master"
});

console.log("Starting Websocket!");

function getCookie(cookie, cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(cookie);
    let ca = decodedCookie.split(";");
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while(c.charAt(0) == " ") {
            c = c.substring(1);
        };
        if(c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        };
    };
    return "";
};

function isJson(message){
    try {
        JSON.parse(message);
        return true;
    } catch(error) {
        return false;
    };
};

ws.on("connection", function(ws, request) {
    if(!isJson(message)) { 
        console.log(`A user (${ws._socket.remoteAddress}) sent "${message}" which isn't a cookie, disallowing`);
        return;
    };
    let rawcookie = getCookie(request.headers.cookie, "xyz_session");
    if(!rawcookie) {
        ws.close(); 
        console.log(`No cookies from ${ws._socket.remoteAddress}`); 
        return;
    };

    if(!rawcookie === "server") {
        database.query(`SELECT * FROM sessions WHERE token = ?`, [rawcookie], function (error, result, fields) {
            if(error) return console.log(error);
            if(!result) return console.log(`No session token found for ${ws._socket.remoteAddress} trying to use ${rawcookie}!`);
            cache[result[0].userid] = ws;
        });
    };
    
    ws.on("message", message => {
        message = message.split(",");
        if(message[0] && message[0].trim() === SECRET_KEY) {
            let userSocket = cache[message[1].trim()];
            if(userSocket && userSocket.readyState === websocket.OPEN) {
                userSocket.send(message[2].trim());
            };
        };
    });
});