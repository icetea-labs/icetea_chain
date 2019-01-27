import handlebars from 'handlebars/dist/handlebars.min.js';
var AU = require('ansi_up');
var ansi_up = new AU.default;

(async () => {
    const hash = new URLSearchParams(window.location.search).get('hash');
    if (hash) {
        const source   = document.getElementById("tableTemplate").innerHTML;
        const template = handlebars.compile(source);
        async function fetchTxDetails() {
            try {
                const res = await fetch("/api/tx?hash=" + hash).then(resp => resp.json());
                
                // Do some formating
                if (res.data.blockTimestamp) {
                    res.data.blockTimestamp = new Date(res.data.blockTimestamp * 1000).toString();
                } else {
                    res.data.blockTimestamp = "N/A (not mined)";
                    res.data.blockHash = "N/A (not mined)"
                }
                if (res.data.error === "null") res.data.error = "";
                res.data.message = res.data.result

                res.data.data = JSON.stringify(res.data.data);

                var html = template(res.data);
                document.getElementById("tableContent").innerHTML = html;

                if (res.data.error) {
                    document.getElementById("result").innerHTML = ansi_up.ansi_to_html(res.data.error);
                }

                return res.data.status !== "Pending";
            } catch (err) {
                console.log(err);
                return false;
            }
        }

        if (!(await fetchTxDetails())) {
            var interval = setInterval(async () => {
                if (await fetchTxDetails()) clearInterval(interval);
            }, 1000);
        }
    }

})();