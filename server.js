const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');

const app = express();

const Miner = require('./blockchain/Node');
const Blockchain = require('./blockchain/Blockchain');
const Tx = require('./blockchain/Tx');

const poa = new Miner(new Blockchain());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('dist'));

app.post('/api/send_tx',function(req, res) {
    const tx = new Tx(
        req.body.from, 
        req.body.to, 
        parseFloat(req.body.value) || 0, 
        parseFloat(req.body.fee) || 0,
        JSON.parse(req.body.data || "{}"));

        poa.txPool.push(tx);

    res.send("Broadcasted");
});

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