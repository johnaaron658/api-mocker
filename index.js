import { createServer } from 'http';
import express from 'express';
import { promises as fs } from 'fs';
import { watch, readdir } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import pkg from 'body-parser';

import { parse, stringify } from './lib/parser.js';
import { criteria } from './lib/matchers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mocksDir = join(__dirname, 'mocks', '\\');

const { json } = pkg;
const portMockMap = {};
const portServerMap = {}; 
let refreshing = false;

watch(mocksDir, {encoding: 'utf-8'}, (event, fileName) => {
    if (!refreshing) {
        refresh();
    }
});

function refresh() {
    refreshing = true;
    clearPortMap();
    closeServers();
    readdir(mocksDir, async (err, fileNames) => {
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
    const content = await fs.readFile(mocksDir + fileName, 'utf-8');
    let mockConfig = parse(content);
    mockConfig.name = fileName.split(".")[0];
    if (portMockMap[mockConfig.port]) {
        portMockMap[mockConfig.port].name += " " + mockConfig.name;
        portMockMap[mockConfig.port].paths = portMockMap[mockConfig.port].paths.concat(mockConfig.paths);
    } else {
        portMockMap[mockConfig.port] = mockConfig;
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

        app.use(path, (req, res, next) => {
            const response = getResponse(req);          
            console.log("request header: " + stringify(req.headers));
            console.log("request body: " + stringify(req.body));
            res.status(response.status);
            res.setHeader('content-type', 'application/json');
            res.send(response.payload);
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