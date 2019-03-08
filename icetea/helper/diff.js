// Credit: https://github.com/odo-network/immuta/blob/master/src/utils/print-difference.js

const chalk = require('chalk')
const _ = require('lodash')

const c = {
  padstart: 5,
  padend: 2,

  // colors
  change: chalk.keyword('tomato'),
  equal: (...args) => chalk.greenBright(...args)
}

function getValue (value, key) {
  if (!value) return value
  if (value instanceof Map) {
    return value.get(key)
  }
  if (value instanceof Set) {
    return key
  }
  return value[key]
}

function iterate (keys, from, to) {
  // console.log(chalk.cyan('> Equal'.padEnd(c.padstart)), chalk.green(':'.padEnd(c.padend)), strings.equal);
  if (typeof to === 'object') {
    if (to instanceof Map) {
      const vals = new Set()
      const diff = new Set()
      if (from instanceof Map) {
        from.forEach((v, k) => {
          if (to.get(k) === v) {
            return
          }
          if (!to.has(k)) {
            diff.add([chalk.red('[delete]'.padEnd(c.padstart + 3)), k, v])
          } else {
            vals.add(k)
            diff.add([c.change('[change]'.padEnd(c.padstart + 3)), k, v, to.get(k)])
          }
        })
      }
      to.forEach((value, k) => {
        const prev = from && from.get(k)
        if (vals.has(k) || value === prev) {
          return
        }
        vals.add(k)
        if (prev !== undefined) {
          diff.add([c.change('[change]'.padEnd(c.padstart + 3)), k, prev, value])
        } else {
          diff.add([c.equal('[create]'.padEnd(c.padstart + 3)), k, prev, value])
        }
      })

      diff.forEach(([type, k, prev, value]) => {
        if (typeof k === 'object') {
          k = JSON.stringify(k)
        }
        console.group(type, c.change(`${typeColor(k)} => (`))
        printKV('Type', stringFromTo(typeColor(typeof prev), typeColor(typeof value)))
        printKV('Value', stringFromTo(typeColor(prev), typeColor(value)))
        if (typeof value === 'object' && !Buffer.isBuffer(value)) {
          console.group(c.change('{'))
          iterate([...keys, k], prev, value)
          console.groupEnd()
          console.log(c.change('}'))
        }
        console.groupEnd()
        console.log(c.change('),'))
      })
    } else if (to instanceof Set) {
      const diff = new Set()

      if (from instanceof Set) {
        to.forEach(v => {
          if (!from.has(v)) {
            diff.add([chalk.green('[add]'.padEnd(c.padstart + 3)), v])
          }
        })
        from.forEach(v => {
          if (!to.has(v)) {
            diff.add([chalk.red('[delete]'.padEnd(c.padstart + 3)), v])
          }
        })
      } else {
        to.forEach(v => {
          diff.add([chalk.green('[add]'.padEnd(c.padstart + 3)), v])
        })
      }

      diff.forEach(([type, value]) => {
        printKV(type, typeColor(typeof value), typeColor(value))
        // if (typeof value === 'object') {
        //   iterate(path, prev, value);
        // }
      })
    } else {
      Object.keys(to).forEach(key => {
        const prev = getValue(from, key)
        const value = getValue(to, key)
        let isEqual = prev === value
        if (!isEqual && Buffer.isBuffer(prev) && Buffer.isBuffer(value)) {
          isEqual = prev.equals(value)
        }

        const path = [...keys, key]

        let sym = []

        if (value && typeof value === 'object') {
          if (Array.isArray(value)) {
            sym = ['[', ']']
          } else if (value instanceof Map) {
            sym = ['Map {', '}']
          } else if (value instanceof Set) {
            sym = ['Set {', '}']
          } else {
            sym = ['{', '}']
          }
        }

        if (isEqual) {
          if (value && typeof value === 'object') {
            console.log(c.equal(`${key}: ${sym[0]} ... Equal ${sym[1]},`))
          } else {
            console.log(c.equal(`${key}: ${typeof value}`))
          }
        } else if (value && typeof value === 'object' && !Buffer.isBuffer(value)) {
          console.group(c.change(`${key}: ${sym[0]}`))
          iterate(path, prev, value)
          console.groupEnd()
          console.log(c.change(`${sym[1]},`))
        } else {
          console.group(c.change(`${key}: (`))
          printKV('Type', stringFromTo(typeColor(typeof prev), typeColor(typeof value)))
          printKV('Value', stringFromTo(typeColor(prev), typeColor(value, true)))
          console.groupEnd()
          console.log(c.change('),'))
        }
      })
    }
  } else {
    console.log(' VALUE')
  }
}

function typeColor (value, raw = false) {
  if (value === true || (!raw && value === 'true')) {
    return chalk.green('true')
  }
  if (value === false || (!raw && value === 'false')) {
    return chalk.keyword('tomato')('false')
  }
  if (!raw && value === 'object') {
    return chalk.keyword('orange')('object')
  }
  if (value === 'number') {
    return chalk.keyword('orange')('number')
  }
  if (value === undefined || (!raw && value === 'undefined')) {
    return chalk.italic.blueBright('undefined')
  }
  if (!Number.isNaN(Number(value))) {
    return `${chalk.keyword('orange')(value)}`
  }
  if (!raw && value === 'string') {
    return chalk.greenBright(value)
  }

  if (typeof value === 'string') {
    return chalk.green(`"${value.length > 100 ? value.slice(0, 99) + '…' : value}"`)
  }
  if (typeof value === 'object') {
    if (Buffer.isBuffer(value)) {
      return `(buffer)`
    }
    return value
  }
  return chalk.keyword('beige')(value)
}

function printKV (key, ...values) {
  console.log(chalk.cyan(key.padEnd(c.padstart)), chalk.green('='.padEnd(c.padend)), ...values)
}

function stringFromTo (from, to, separator = '--->') {
  return `${from}  ${chalk.greenBright(separator)}  ${to}`
}

function deepEqual (x, y) {
  if (x === y) {
    return true
  } else if (Buffer.isBuffer(x) && Buffer.isBuffer(y)) {
    return x.equals(y)
  } else if ((typeof x === 'object' && x != null) && (typeof y === 'object' && y != null)) {
    if (Object.keys(x).length !== Object.keys(y).length) { return false }

    for (var prop in x) {
      if (y.hasOwnProperty(prop)) {
        if (!deepEqual(x[prop], y[prop])) { return false }
      } else { return false }
    }

    return true
  } else { return false }
}

function diff (from, to, label) {
  console.group(chalk.yellow(label))
  if (from === to) {
    console.log(c.equal('state: { ...Equal  }'))
  } else {
    console.group(c.change('state: {'))
    iterate(['$state'], from, to)
    console.groupEnd()
    console.log(c.change('}'))
  }
  console.groupEnd()
}

function yellow (message) {
  console.log(chalk.yellow(message))
}

let oldStateTable
exports.beforeTx = (stateTable) => {
  oldStateTable = _.cloneDeep(stateTable)
}

exports.afterTx = (stateTable) => {
  yellow('--- STATE DIFF ---')
  let noDiff = true
  Object.keys(stateTable).forEach(addr => {
    if (!oldStateTable.hasOwnProperty(addr)) {
      noDiff = false
      diff(undefined, stateTable[addr], `DEPLOYED: ${addr}`)
    }
  })

  Object.keys(oldStateTable).forEach(addr => {
    if (!stateTable.hasOwnProperty(addr)) {
      noDiff = false
      diff(oldStateTable[addr], undefined, `DELETED: ${addr}`)
    } else if (!deepEqual(oldStateTable[addr], stateTable[addr])) {
      noDiff = false
      diff(oldStateTable[addr], stateTable[addr], `MODIFIED: ${addr}`)
    }
  })

  noDiff && yellow('No state changed.')
  yellow('To turn off state diff, set env variable PRINT_STATE_DIFF=0')
}
