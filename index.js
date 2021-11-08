const http = require('http');
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const parser = require('./lib/parser');

const mocksDir = path.join(__dirname, 'mocks', '\\');
const mockServerMap = {}; 

fs.readdir(mocksDir, function (err, fileNames) {
    if (err) {
        console.log("error in reading directory: " + fileNames);
        return;
    }
    fileNames.forEach(startMocksFromFile);
});

fs.watch(mocksDir, {encoding: 'utf-8'}, (event, fileName) => {
    startMocksFromFile(fileName);
})

function startMocksFromFile(fileName) {
    console.log(fileName);
    fs.readFile(mocksDir + fileName, 'utf-8', (err, content) => {
        if (err) {
            console.log("error in reading file: " + fileName);
            return;
        }
        let mockConfig = parser.parse(content);
        mockConfig.name = fileName.split(".")[0];
        startMocks(mockConfig);
    })
} 

function startMocks(mockConfig) {    
    let app = express();

    setMocks(mockConfig.paths, app);
    
    const server = http.createServer(app);

    if (mockServerMap[mockConfig.name]) {
        mockServerMap[mockConfig.name].close();
    } 

    server.listen(mockConfig.port);
    mockServerMap[mockConfig.name] = server;

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
