const express = require('express');
const app = express();
const Miner = require('./Node');
const Blockchain = require('./Blockchain');
const Tx = require('./Tx');

const fptMiner = new Miner(new Blockchain());

app.use(express.static('dist'));

app.get('/api/send_tx',function(req, res) {
    //console.log(JSON.parse(decodeURIComponent(req.query.extra)));
    const tx = new Tx(req.query.from, req.query.to, req.query.value, req.query.fee,
        JSON.parse(req.query.data));
    fptMiner.txPool.push(tx);

    res.send("Added");
});

app.get('/api/balance',function(req, res) {
    const who = req.query.who;
    res.send(`Balance of ${who} is ${fptMiner.balanceOf(who)}`);
});

app.get('/api/node', (req, res) => {
    res.json(fptMiner);
});

fptMiner.startMine();
app.listen(3000,function() {'Web listening at port 3000!'});