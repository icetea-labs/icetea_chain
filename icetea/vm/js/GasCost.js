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

exports.GasUsage = class {
  constructer (fee) {
    this.gasLeft = getGasUnit(fee)
  }

  gasLeft () {
    return this.gasLeft
  }

  useGas (amount) {
    this.gasLeft -= amount
    if (this.gasLeft < 0) {
      throw new Error('Out of gas')
    }
  }

  useGasFor (op) {
    this.useGas(CostTable[op])
  }

  enterLoop () {
    this.useGas(CostTable.EnterLoop)
  }

  enterFunction () {
    this.useGas(CostTable.EnterFunction)
  }

  setState (o) {
    const cost = JSON.stringify(o).length * CostTable.StorageUnitPrice
    this.useGas(cost)
  }
}
