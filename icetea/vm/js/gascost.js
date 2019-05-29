/** @module */

const CostTable = {
  StorageUnitPrice: 10000,
  EnterLoop: 10,
  EnterFunction: 20
}

const FREE_GAS_AMOUNT = 1000000 // 1 million
const FEE_MULTIPLIER = 1000000 // 1 million

const getGasUnit = (fee) => {
  return FREE_GAS_AMOUNT + (fee || 0) * FEE_MULTIPLIER
}

/** Class gas usage */
class GasUsage {
  /**
   * tx fee to gas left.
   * @constructor
   * @param {number} fee - tx fee.
   */
  constructor (fee) {
    this.gasLeft = getGasUnit(fee)
  }

  /**
   * gas left for execution.
   * @returns {number} gas left
   */
  gasLeft () {
    return this.gasLeft
  }

  /**
   * use gas.
   * @param {number} amount - gas amount.
   */
  useGas (amount) {
    this.gasLeft -= amount
    if (this.gasLeft < 0) {
      throw new Error('Out of gas')
    }
  }

  /**
   * use gas for specific op code.
   * @param {string} op - opcode.
   */
  useGasFor (op) {
    this.useGas(CostTable[op])
  }

  /**
   * use gas for a loop
   */
  enterLoop () {
    this.useGas(CostTable.EnterLoop)
  }

  /**
   * use gas for a function
   */
  enterFunction () {
    this.useGas(CostTable.EnterFunction)
  }

  /**
   * use gas for setting state
   * @param {object} o - state object
   */
  setState (o) {
    const cost = JSON.stringify(o).length * CostTable.StorageUnitPrice
    this.useGas(cost)
  }
}

exports.GasUsage = GasUsage
exports.CostTable = CostTable
