require('leveldown').destroy('./state', (err) => {
    if (err) {
        console.error('Error deleting state LevelDB', err)
    } else {
        console.log('State levelDB deleted.')
    }
})