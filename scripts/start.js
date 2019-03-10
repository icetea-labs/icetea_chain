const { spawn } = require('child_process')

// start icetea server
spawn(process.argv[0], ['./icetea/index.js'], {
    stdio: 'inherit'
})

// deploy the faucet
setTimeout(() => {
    spawn(process.argv[0], ['./scripts/faucet.js'], {
        stdio: 'inherit'
    })
}, 5000)