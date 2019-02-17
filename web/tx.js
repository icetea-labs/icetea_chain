import handlebars from 'handlebars/dist/handlebars.min.js';
import {decodeTX, switchEncoding} from './utils';
import tweb3 from "./tweb3";

var AU = require('ansi_up');
var ansi_up = new AU.default;

(async () => {
    const hash = new URLSearchParams(window.location.search).get('hash');
    if (hash) {
        const source   = document.getElementById("tableTemplate").innerHTML;
        const template = handlebars.compile(source);
        async function fetchTxDetails() {
            try {
                const [tx, error] = await tweb3.getTransaction(hash);

                if (error) throw error;

                tx.status = tx.tx_result.code ? "Error" : "Success";

                const data = decodeTX(tx.tx);
                tx.from = data.from;
                tx.to = data.to;
                tx.value = data.value;
                tx.fee = data.fee;

                tx.txType = "transfer";
                data.data = JSON.parse(data.data) || {};
                if (data.data.op === 0) {
                    tx.txType = "create contract";
                    //tx.to = tx.tx_result.data;
                } else if (data.data.op === 1) {
                    tx.txType = "call contract";
                }

                tx.data = JSON.stringify(data.data);
                
                // Do some formating
                
                if (tx.error === "null") tx.error = "";
                tx.message = tx.tx_result.data;

                tx.data = JSON.stringify(tx.data);

                var html = template(tx);
                document.getElementById("tableContent").innerHTML = html;

                if (tx.tx_result.code) {
                    document.getElementById("result").innerHTML = ansi_up.ansi_to_html(tx.tx_result.log);
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