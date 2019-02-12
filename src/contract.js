import $ from 'jquery';
window.$ = $;
import * as utils from './utils';

function buildData() {
    return {
        op: 1,
        name: document.getElementById("name").value,
        params: utils.parseParamsFromField("#params")
    }
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

    const funcs = await fetch("/api/funcs?contract=" + contract).then(resp => resp.json());
    var select = document.getElementById("funcs");
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
    utils.registerTxForm($('#form'), buildData);

    $('#read').on('click', async function(e){
        var form = document.getElementById('form');
        var address = form.to.value.trim();
        var name = form.name.value.trim();
        // if (!name) {
        //     alert("Please select a contract which has function.");
        //     return;
        // }
        document.getElementById("funcName").textContent = name;
        
        var params = utils.parseParamsFromField("#params");

        const result = await fetch("/api/call?" + $.param({address, name, params})).then(resp => resp.json());
        if (result.success) {
            document.getElementById("resultJson").textContent = utils.tryStringifyJson(result.data);
        } else {
            document.getElementById("resultJson").textContent = utils.tryStringifyJson(result.error);
        }
    })
});