const createServer = require('http').createServer;
const fs = require('fs').promises;
const { watch, readdir }= require('fs'); 
const fileURLToPath = require('url');
const { join, dirname } = require('path');
const express = require('express');
const pkg = require('body-parser');

const { parse, stringify } = require('./lib/parser.js');
const { criteria } = require('./lib/matchers.js');
const { modulePath } = require('./lib/utils/module-utils.js');

const mocksDir = 'mocks';
const customScriptsDir = 'customscripts';
const downloadsDir = 'downloads';

const __mocksDir = join(__dirname, mocksDir, process.platform == 'win32' ? '\\' : '/');

const { json } = pkg;
const portMockMap = {};
const portServerMap = {}; 
let refreshing = false;

watch(__mocksDir, {encoding: 'utf-8'}, (event, fileName) => {
    if (!refreshing) {
        refresh();
    }
});

function refresh() {
    refreshing = true;
    clearPortMap();
    closeServers();
    readdir(__mocksDir, async (err, fileNames) => {
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
    for (const port in portMockMap) delete portMockMap[port];
}

function closeServers() {
    for (const port in portServerMap) portServerMap[port].close();
}

async function initializePortMockMap(fileName) {
    console.log(fileName);
    try {
        const content = await fs.readFile(__mocksDir + fileName, 'utf-8');
        let mockConfig = parse(content);
        mockConfig.name = fileName.split(".")[0];
        if (portMockMap[mockConfig.port]) {
            portMockMap[mockConfig.port].name += " " + mockConfig.name;
            portMockMap[mockConfig.port].paths = portMockMap[mockConfig.port].paths.concat(mockConfig.paths);
        } else {
            portMockMap[mockConfig.port] = mockConfig;
        }
    } catch {
        console.log(fileName + " is a folder");
    }
} 

function startAllMocks() {
    for (const port in portMockMap) {
        startMocks(portMockMap[port]);
    }
}

function startMocks(mockConfig) {    
    let app = express();

    setMocks(mockConfig.paths, app);
    
    const server = createServer(app);

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
        app.use(json());

        app.use(path, async (req, res, next) => {
            const response = getResponse(req);          
            console.log("request header: " + stringify(req.headers));
            console.log("request body: " + stringify(req.body));
            
            
            if (response.custom) { 
                // for custom logic
                const module = modulePath('.', mocksDir, customScriptsDir, response.custom) + '.js';
                console.log(module);
                const { run } = require(module);
                run(req, res, next);
            } else if (response.downloads) {
                // for file downloads
                const file = join(__dirname, mocksDir, downloadsDir, response.downloads);
                res.download(file);
            } else {
                res.status(response.status);
                res.setHeader('content-type', 'application/json');
                res.send(response.payload);
            }
        });
    })
}

function setReqResMap(mocks) {
    return (req) => {
        const matchingMock = getMatchingMock(mocks, req);
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

function getMatchingMock(mocks, req) {
    const mockScores = mocks.map(mock => ({score: 0, mock: mock}));
    for (const getCriteriumScore of criteria) {
        mockScores.forEach(mockScore => mockScore.score += getCriteriumScore(mockScore.mock, req))
    }
    const maxScoreMock = mockScores.reduce((max, mockScore) => mockScore.score > max.score ? mockScore : max);
    return maxScoreMock.score === 0 ? null : maxScoreMock.mock;
}


refresh();