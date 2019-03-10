const { spawn } = require('child_process');

// start icetea server
spawn(process.argv[0], ['./icetea/index.js'])

// deploy the faucet
setTimeout(() => {
    const subprocess = spawn(process.argv[0], ['./scripts/faucet.js'], {
        detached: true,
        stdio: 'inherit',
        shell: true
      });
      subprocess.unref();
}, 3000)