require('leveldown').destroy('./state', (err) => {
  if (err) {
    console.error('Error deleting state LevelDB', err)
  } else {
    console.log('State levelDB deleted.')
  }
})

const fs = require('fs')
const path = require('path')

const directory = path.resolve(process.cwd(), 'contract_src')

fs.readdir(directory, (err, files) => {
  if (err) return console.error(err)

  for (const file of files) {
    if (file.endsWith('.js')) {
      fs.unlink(path.join(directory, file), err => {
        if (err) throw err
      })
    }
  }

  console.log('Contract src deleted.')
})
