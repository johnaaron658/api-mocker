const http = require('http');
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const mocksDir = path.join(__dirname, 'mocks', '\\');
console.log("mockdir: " + mocksDir);

fs.readdir(mocksDir, function (err, fileNames) {
    if (err) {
        console.log("error in reading directory: " + fileNames);
        return;
    }
    fileNames.forEach((fileName) => {
        console.log(fileName);
        fs.readFile(mocksDir + fileName, 'utf-8', (err, content) => {
            if (err) {
                console.log("error in reading file: " + fileName);
                return;
            }
            let mockConfig = JSON.parse(content);
            mockConfig.name = fileName.split(".")[0];
            startMock(mockConfig);
        })
    });
});

function startMock(mockConfig) {    
    let app = express();

    let path = mockConfig.path;
    if (path == null) {
        path = '/';
    }

    app.use(bodyParser.json());

    app.use(path, (req, res, next) => {
        console.log("request on port: " + mockConfig.port);
        console.log("request header: " + JSON.stringify(req.headers));
        console.log("request body: " + JSON.stringify(req.body));
        res.status(200);
        res.setHeader('content-type', 'application/json');
        res.send(mockConfig.payload);
    });

    let server = http.createServer(app);
    server.listen(mockConfig.port);
    console.log("started '" + mockConfig.name + "' at http://localhost:" + mockConfig.port + "/");
}

function payloadmapper(payload) {
    let object = {};
    payload.map(configCap => configCap.configsSupported)
           .map(supported => supported.forEach(cap => {
                if (cap.supportsTudr) {
                    object[cap.config] = 1;
                }
           }));
    console.log(JSON.stringify(object));
}