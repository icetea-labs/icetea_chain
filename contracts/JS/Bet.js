@contract class Bet  {
    bet (z1) {
        let zz = "" + z1;
        if (zz !== "1") zz = "0";

        let x = "" + parseInt(block.hash, 16) % 2;
        if (x === zz) {
            // User wins, transfer money to him/her
            this.transfer(msg.sender, msg.value * 2);
        }  else {
            // Contract wins just keep the money (do nothing)
        }
    }
}
