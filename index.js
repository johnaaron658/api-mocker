const http = require('http');
const express = require('express');
const fs = require('fs').promises;
const fswatch = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const parser = require('./lib/parser');

const mocksDir = path.join(__dirname, 'mocks', '\\');
const portMockMap = {};
const portServerMap = {}; 
let refreshing = false;

fswatch.watch(mocksDir, {encoding: 'utf-8'}, (event, fileName) => {
    if (!refreshing) {
        refresh();
    }
});

function refresh() {
    refreshing = true;
    clearPortMap();
    closeServers();
    fswatch.readdir(mocksDir, async (err, fileNames) => {
        if (err) {
            console.log("error in reading directory: " + fileNames);
            return;
        }
        for (const fileName of fileNames) {
            await initializePortMockMap(fileName);
        }
        startAllMocks();
        refreshing = false;
    });
}

function clearPortMap() {
    for (port in portMockMap) delete portMockMap[port];
}

function closeServers() {
    for (port in portServerMap) portServerMap[port].close();
}

async function initializePortMockMap(fileName) {
    console.log(fileName);
    const content = await fs.readFile(mocksDir + fileName, 'utf-8');
    let mockConfig = parser.parse(content);
    mockConfig.name = fileName.split(".")[0];
    if (portMockMap[mockConfig.port]) {
        portMockMap[mockConfig.port].name += " " + mockConfig.name;
        portMockMap[mockConfig.port].paths = portMockMap[mockConfig.port].paths.concat(mockConfig.paths);
    } else {
        portMockMap[mockConfig.port] = mockConfig;
    }
} 

function startAllMocks() {
    for (port in portMockMap) {
        startMocks(portMockMap[port]);
    }
}

function startMocks(mockConfig) {    
    let app = express();

    setMocks(mockConfig.paths, app);
    
    const server = http.createServer(app);

    if (portServerMap[mockConfig.port]) {
        portServerMap[mockConfig.port].close();
    } 

    server.listen(mockConfig.port);
    portServerMap[mockConfig.port] = server;

    console.log("started '" + mockConfig.name + "' at http://localhost:" + mockConfig.port + "/");
}

function setMocks(paths, app) {
    paths.forEach((mockPath) => {
        let path = mockPath.path;
        if (path == null) {
            path = '/';
        }
        const getResponse = setReqResMap(mockPath.mocks);
        app.use(bodyParser.json());

        app.use(path, (req, res, next) => {
            response = getResponse(req);          
            console.log("request header: " + parser.stringify(req.headers));
            console.log("request body: " + parser.stringify(req.body));
            res.status(response.status);
            res.setHeader('content-type', 'application/json');
            res.send(response.payload);
        });
    })
}

function setReqResMap(mocks) {
    return (req) => {
        const matchingMock = mocks.find(mock => isProjectionMatch(mock.request, req));
        if (!matchingMock) {
            return {
                payload: {
                    message: 'No mock found'
                },
                status: 500
            }
        }
        return matchingMock.response;
    }
}

function isProjectionMatch(refObj, targetObj) {
    const projection = project(refObj, targetObj);
    return parser.stringify(refObj) === parser.stringify(projection);
}

function project(refObj, targetObj) {
    const projection = {};
    for (key in refObj) {
        if (key in targetObj && targetObj[key]) {
            if (typeof refObj[key] === 'object') {
                projection[key] = project(refObj[key], targetObj[key]);
            } else {
                projection[key] = targetObj[key];
            }
        }
    }
    return projection;
}

refresh();