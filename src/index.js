import JSONFormatter from 'json-formatter-js';

(async () => {
    var parts = location.href.split("?");
    if (parts.length > 1) {
        document.getElementById("info").textContent = decodeURIComponent(parts[1]);
        setTimeout(() => {
            document.getElementById("info").textContent = "";
        }, 4000);
    }

    const myJSON = await fetch("/api/node")
    .then((resp) => {
        return resp.json();
    })

    const formatter = new JSONFormatter(myJSON, Infinity);

    document.getElementById("content").appendChild(formatter.render());
})();