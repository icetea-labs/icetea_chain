const express = require('express');
const app = express();
const Miner = require('./Miner');
const Blockchain = require('./Blockchain');
const Tx = require('./Tx');

const fptMiner = new Miner(new Blockchain());

app.get('/tx',function(req, res)
{
    const tx = new Tx(req.query.from, req.query.to, req.query.value, req.query.fee);
    fptMiner.txPool.push(tx);

    res.send("Added");
});

app.get('/', (req, res) => {
    res.json(fptMiner);
});

fptMiner.startMine();
app.listen(3000,function() {'Web listening at port 3000!'});