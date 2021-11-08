# api-mocker
## Usage
Make sure Node.js is installed in your system. In the directory, run:
```zsh
npm install
```
To run your mock, simply place your API mock file/s under the `./mocks` folder then run:
```zsh
npm start
```

## API Mock Format
An **API Mock File** is meant to mock a single microservice. A service can have multiple endpoints (**paths**). Each of these endpoints/paths, in turn, can have multiple request-response mappings (**mocks**).
```javascript
{
    "port" : 9090,
    "paths" : [
        {
            "path": "/path",
            "mocks": [
                // request-response mappings
                {
                    "request": {
                        "headers": {
                            // request headers...
                        },
                        "body": {
                            // request body...
                        }
                    },
                    "response": {
                        "payload": {
                            // response body...
                        },
                        "status": 200 // response status
                    } 

                },
            ]
        }
    ]
}
```
- **port** - the port on which the microservice listens to.
- **paths** - a list of all the paths or endpoints in the service.
    - **path** - a string corresponding to the endpoint.
    - **mocks** - a list of request-response mappings to be mocked.
        - **request** - an object describing the request to be mapped to a mock response. 
            - This request object contains the fields to watch out for in the incoming request, therefore, there is no need to put every single expected detail in an incoming request (if you don't need to watch out for the *request headers*, you may choose not to specify it in the mock file).
            - If an incoming request does not match any of the requests specified in the mock file, a default response will be sent.
        - **response** - the response to be sent for a request that matches.
            - **payload** - the response body
            - **status** - the response status