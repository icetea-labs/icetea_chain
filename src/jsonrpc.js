function connect(endpoint) {
    return {

    }
}

class HttpProvider {
    constructor(endpoint) {
        this.endpoint = endpoint;
    }

    call(method, params) {
        fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: Date.now(),
                method: method,
                params: params
            })
        })
        .then(resp => resp.json())
        .then(resp => ({result: resp.result, error: resp.error}))
    }
}