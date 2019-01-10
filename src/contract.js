// document.getElementById("form").addEventListener("submit", (e) => {
//     if (!document.getElementById("name").value.trim().length) {
//         alert("Please input contract function name!")
//         e.preventDefault();
//     }

//     // TODO: more input validation
// })

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

    document.getElementById("data").value = JSON.stringify(data); 
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
    buildData();
}

buildData();
document.getElementById("name").addEventListener("change", buildData);
document.getElementById("params").addEventListener("input", buildData);
fillContracts();


$(document).ready(function () {
    $('#form_contract').submit(false);
    $("#submit_btn").click(function () {
        buildData()
        var data = $('#form_contract').serializeArray().reduce(function (obj, item) {
            obj[item.name] = item.value;
            return obj;
        }, {});
        var privateKey = $("#private_key").val()
        var pubkey = data.from
        var signature = eosjs_ecc.sign(JSON.stringify(data), privateKey)

        //submit tx
        $.ajax({
            url: "/api/send_tx",
            method: "POST",
            data: {
                signature, pubkey, data: JSON.stringify(data)
            },
            success: function (result) {
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