const express = require('express');
const bodyParser = require('body-parser');
const app = express();

const Miner = require('./Node');
const Blockchain = require('./Blockchain');
const Tx = require('./Tx');

const fptMiner = new Miner(new Blockchain());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('dist'));

app.post('/api/send_tx',function(req, res) {
    const tx = new Tx(
        req.body.from, 
        req.body.to, 
        parseFloat(req.body.value) || 0, 
        parseFloat(req.body.fee) || 0,
        JSON.parse(req.body.data));

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