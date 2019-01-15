import Tx from '../blockchain/Tx';

function replaceAll(text, search, replacement) {
    return text.split(search).join(replacement);
}

function buildData() {
    let pText = document.getElementById("params").value;
    pText = replaceAll(pText, "\r", "\n");
    pText = replaceAll(pText, "\n\n", "\n");
    let params = pText.split("\n").filter((e) => {
        return e.trim().length;
    })

    var data = {
        op: 1,
        name: document.getElementById("name").value,
        params: params
    }

    return data;
}

async function fillContracts() {
    const contracts = await fetch("/api/contracts")
    .then((resp) => {
        return resp.json();
    })
    if (!contracts.length) return;

    var select = document.getElementById("to");
    contracts.forEach(item => {
        let option = document.createElement("option");
        option.value = item;
        option.textContent = item;
        select.appendChild(option);
    });

    fillFuncs();
    select.addEventListener("change", fillFuncs);
}

async function fillFuncs() {
    var contract = document.getElementById("to").value;
    if (!contract) return;

    const funcs = await fetch("/api/funcs?contract=" + contract)
    .then((resp) => {
        return resp.json();
    })
    var select = document.getElementById("name");
    select.innerHTML = "";
    funcs.forEach(item => {
        if (item.indexOf("$") !== 0) {
            let option = document.createElement("option");
            option.value = item;
            option.textContent = item;
            select.appendChild(option);
        }
    });
}

$(document).ready(function () {
    fillContracts();
    $('#form').submit(function (e) {
        e.preventDefault();

        var formData = $(this).serializeArray().reduce(function (obj, item) {
            obj[item.name] = item.value;
            return obj;
        }, {});
        var txData = buildData();
        formData.data = JSON.stringify(txData);
        var privateKey = $("#private_key").val();
        formData.from = eosjs_ecc.privateToPublic(privateKey);
        var tx = new Tx(formData.from, formData.to, formData.value, formData.fee, txData);
        formData.signature = eosjs_ecc.sign(tx.hash, privateKey)

        //submit tx
        $.ajax({
            url: "/api/send_tx",
            method: "POST",
            data: formData,
            success: function (result) {
                console.log(result)
                if (result.success) {
                   window.location.href = '/?' + encodeURIComponent("Transaction broadcasted successfully.")
                } else {
                    alert(result.error)
                }
                console.log(result)
            }
        });
    })
});