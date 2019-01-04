import JSONFormatter from 'json-formatter-js'

(async () => {
    const myJSON = await fetch("/api/node")
    .then((resp) => {
        return resp.json();
    })

    const formatter = new JSONFormatter(myJSON);

    document.getElementById("content").appendChild(formatter.render());
})();