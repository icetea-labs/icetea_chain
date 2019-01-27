const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');

const app = express();

const Miner = require('./blockchain/Node');
const Blockchain = require('./blockchain/Blockchain');
const Tx = require('./blockchain/Tx');

const poa = new Miner(new Blockchain());

app.use(bodyParser.urlencoded({ extended: false }));

if (process.env.NODE_ENV === "production") {
    app.use(express.static('dist'));
}

app.post('/api/send_tx',function(req, res) {
    try {
        var body = req.body;

        const tx = new Tx(
            body.from, 
            body.to, 
            parseFloat(body.value) || 0, 
            parseFloat(body.fee) || 0,
            JSON.parse(body.data || "{}"));
        tx.setSignature(body.signature);

        poa.addTxToPool(tx);
        
        res.json({
            success: true,
            data: {
                tx_hash: tx.hash
            }
        });
    } catch (error) {
        console.log(error)
        res.json({
            success: false,
            error: error
        })
    }
});

app.get('/api/call',function(req, res) {
    try {
        var query = req.query;
        var params = query.params;
        if (params) {
            params = decodeURIComponent(params);
        }
        var result = poa.callViewFunc(query.address, query.name, params);       
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        //console.log(error)
        res.json({
            success: false,
            error: String(error)
        })
    }
});

app.get('/api/tx', function(req, res){
    const receipt = poa.getReceipt(req.query.hash);
    if (!receipt) {
        return res.json({
            success: false,
            error: "Invalid transaction hash. Transaction not found."
        })
    } else {
        res.json({
            success: true,
            data: receipt
        })
    }
})

app.get('/api/balance',function(req, res) {
    const who = req.query.who;
    res.send(`Balance of ${who} is ${poa.balanceOf(who)}`);
});

app.get('/api/node', (req, res) => {
    res.json(poa);
});

app.get('/api/contracts', (req, res) => {
    res.json(poa.getContractAddresses());
});

app.get('/api/funcs', (req, res) => {
    const addr = req.query.contract;
    let arr = [];
    if (addr) {
        arr = poa.getFuncNames(addr);
    } 
    res.json(arr);
});

poa.startMine();
app.listen(3000,function() {'Web listening at port 3000!'});