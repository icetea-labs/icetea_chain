@contract class Bet  {
    // You could call bet, or just send ETH
    @onReceived @transaction  bet(z1) {
        let zz = "" + z1; // convert to string
        if (zz !== "1") zz = "0"; // ensure it is just "0" or "1"

        // make a random x, based on block hash
        let x = "" + parseInt(block.hash, 16) % 2;

        if (x === zz) {
            // User wins, transfer money to him/her
            this.transfer(msg.sender, msg.value * 2);
        }  else {
            // Contract wins, just keep the money (do nothing)
        }
    }
}
