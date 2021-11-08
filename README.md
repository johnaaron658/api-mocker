# api-mocker
## Usage
Simply place your API mock file/s under the `./mocks` folder then run `run.bat`.

## API Mock Format
```json
{
    "port" : 9090,
    "paths" : [
        {
            "path": "/path",
            "mocks": [
                {
                    "request": {
                        "headers": {
                            // request headers
                        },
                        "body": {
                            // request body
                        }
                    },
                    "response": {
                        "payload": {
                            // response body
                        },
                        "status": 200 // response status
                    } 

                },
            ]
        }
    ]
}
```
