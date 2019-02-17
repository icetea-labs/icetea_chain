import $ from 'jquery';
window.$ = $;
const msgpack = require('msgpack5')();
import * as helper from './domhelper';
import * as utils from './utils';
import tweb3 from './tweb3'

function buildData() {
    return {
        op: 1,
        name: document.getElementById("name").value,
        params: helper.parseParamsFromField("#params")
    }
}

async function fillContracts() {
    const [contracts, err] = await tweb3.getContracts();
    if (err) {
        console.log("Error fetching contract list", err);
        return;
    }
    if (!contracts.length) return;

    var select = document.getElementById("to");
    contracts.reverse().forEach(item => {
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

    const [funcs, err] = await tweb3.getFunctionList(contract);
    if (err) {
        console.log("Error fetching function list", err);
        return;
    }

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
    helper.registerTxForm($('#form'), buildData);

    $('#read').on('click', async function(e){
        var form = document.getElementById('form');
        var address = form.to.value.trim();
        var name = form.name.value.trim();
        // if (!name) {
        //     alert("Please select a contract which has function.");
        //     return;
        // }
        document.getElementById("funcName").textContent = name;
        
        var params = helper.parseParamsFromField("#params");

        const [result, error] = await tweb3.callReadonlyContractMethod(address, name, params);
        console.log(result, error)
        if (!error && result.success) {
            document.getElementById("resultJson").textContent = result.data.info;
        } else {
            document.getElementById("resultJson").textContent = utils.tryStringifyJson(error || result.error);
        }
    })
});