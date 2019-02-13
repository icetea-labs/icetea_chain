import handlebars from 'handlebars/dist/handlebars.min.js';
import {query} from "./utils";
var AU = require('ansi_up');
var ansi_up = new AU.default;

(async () => {
    const hash = new URLSearchParams(window.location.search).get('hash');
    if (hash) {
        const source   = document.getElementById("tableTemplate").innerHTML;
        const template = handlebars.compile(source);
        async function fetchTxDetails() {
            try {
                const [tx, error] = await query('tx', hash);
                if (error) throw error;

                tx.txType = "transfer";
                if (tx.op === 0) {
                    res.txType = "create contract";
                } else if (tx.data.op === 1) {
                    tx.txType = "call contract";
                }
                
                // Do some formating
                if (tx.blockTimestamp) {
                    tx.blockTimestamp = new Date(tx.blockTimestamp * 1000).toString();
                } else {
                    tx.blockTimestamp = "N/A (not mined)";
                    tx.blockHash = "N/A (not mined)"
                }
                if (tx.error === "null") tx.error = "";
                tx.message = tx.result

                tx.data = JSON.stringify(tx.data);

                var html = template(tx);
                document.getElementById("tableContent").innerHTML = html;

                if (tx.error) {
                    document.getElementById("result").innerHTML = ansi_up.ansi_to_html(tx.error);
                }

                return tx.status !== "Pending";
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