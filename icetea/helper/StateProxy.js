const _ = require('lodash')
const { deepFreeze } = require('./utils')

/*
1. Contracts could view (by calling 'view' methods):
 - its own storage
 - other accounts' balances
2. Contracts could change (by sending transaction):
 - its own storage
 - transfer its balance to other account

 Contracts not allow to touch other state (src, meta, etc.).
*/

const makeNotAllowed = (operations, mode = 'view') => {
    return operations.reduce((funcs, op) => {
        funcs.push(() => {
            throw new Error(`${op} is not allowed in '${mode}' mode.`)
        })
    }, [])
}

const getStateProxy = (stateTable, contractAddress, readonly = true) => {

    const contractStorage = (stateTable[contractAddress] || {}).state
    let stateProxy
    if (contractStorage) {
        stateProxy = _.deepClone(contractStorage.state) // consider using immer to improve performance
    }
    if (readonly && stateProxy) {
        deepFreeze(stateProxy) // this is a trade-off, dev (debug) over user (performance)
    }

    const balances = {}

    const balanceOf = (addr) => {
        if (balances.hasOwnProperty[addr]) {
            return balances[addr]
        }
        return (stateTable[addr] || {}).balance || 0
    }

    const getState = (key, defaultValue) => {
        if (!stateProxy) return defaultValue

        const state = stateProxy.getState(key)
        return typeof state !== 'undefined' ? state : defaultValue
    }

    const hasState = key => {
        return stateProxy.hasOwnProperty(key)
    }

    let transfer, setState, deleteState

    if (readonly) {
        [transfer, setState, deleteState] = makeNotAllowed(['transfer', 'setState', 'deleteState'])
    } else {
        setState = (key, value) => {
            if (!stateProxy) {
                stateProxy = { key: value }
            } else {
                stateProxy[key] = value
            }
        }

        deleteState = key => {
            if (stateProxy) {
                delete stateProxy[key]
            }
        }

        transfer = (to, value) => {
            if (value === 0) {
                throw new Error('Cannot transfer zero value.')
            }
            const contractBalance = balanceOf(contractAddress)

            if (value > contractBalance) {
                throw new Error('Not enough balance.')
            }

            if (balances[contractAddress]) {
                balances[contractAddress] -= value
            } else {
                balances[contractAddress] = contractBalance - value
            }

            if (balances[to]) {
                balances[to] += value
            } else {
                balances[to] = balanceOf(to) + value
            }
        }
    }

    return [{
        balanceOf,
        hasState,
        getState,
        setState,
        deleteState,
        transfer
    }, {
        stateProxy,
        balances
    }]
}

const getStateForView = (stateTable, contractAddress) => {
    return getStateProxy(stateTable, contractAddress, false)[0]
}

const getStateForUpdate = (stateTable, contractAddress) => {
    return getStateProxy(stateTable, contractAddress, true)
}

const applyChanges = (stateTable, contractAddress, {stateProxy, balances}) => {

    // Because our TXs run sequentially, and it could not access draft after done
    // it appear that we don't need to _.merge?
    stateTable[contractAddress].state = stateProxy

    if (balances) {
        Object.keys(balances).forEach(addr => {
            const value = balances[addr]
            stateTable[addr] = stateTable[addr] || {}
            stateTable[addr].balance = value
        })
    }

    return stateTable
}

module.exports = { getStateForView, getStateForUpdate, applyChanges }