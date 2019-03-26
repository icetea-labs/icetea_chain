const { spawn } = require('child_process')

// start icetea server
spawn(process.argv[0], ['./icetea/index.js'], {
  stdio: 'inherit'
})

// deploy the faucet
setTimeout(() => {
  const subprocess = spawn(process.argv[0], ['./scripts/astro.js'], {
    detached: true,
    stdio: 'inherit'
  })
  subprocess.unref()
}, 5000)
