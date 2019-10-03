// we we try to serialize big object using json, msgpack, and v8
// and compare size and performance

const v8 = require('../icetea/state/serializer/v8')
const msgpack = require('../icetea/state/serializer/msgpack')
const json = require('../icetea/state/serializer/json')

const { PerformanceObserver, performance } = require('perf_hooks')

const makeBigObject = n => {
  const r = {}
  for (let i = 0; i < n; i++) {
    r['a' + i] = new Array(n)
    r['a' + i].fill({ test: 100 + i })
  }
  return r
}

const test = (engine, n) => {
  const o = makeBigObject(n)
  const name = engine.constructor.name
  const m0 = name + '0'
  const m1 = name + '1'
  const m2 = name + '2'

  performance.clearMarks()

  performance.mark(m0)
  const encoded = engine.serialize(o)
  performance.mark(m1)
  engine.deserialize(encoded)
  performance.mark(m2)

  // Measure
  performance.measure(name + ' - encode', m0, m1)
  performance.measure(name + ' - decode', m1, m2)

  // Print size
  console.log(name + ' - size: ' + encoded.length.toLocaleString() + ' bytes')
}

const obs = new PerformanceObserver((items) => {
  const e = items.getEntries()[0]
  console.log(`${e.name}: ${e.duration} ms`)
})
obs.observe({ entryTypes: ['measure'] })

const COUNT = 1000
test(msgpack, COUNT)
test(json, COUNT)
test(v8, COUNT)
