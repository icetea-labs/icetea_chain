import Tx from '../blockchain/Tx';
import ecc from '../blockchain/helper/ecc';

function buildData () {
    return {};
}

$(document).ready(function () {
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
        formData.signature = ecc.sign(tx.hash, privateKey)

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
