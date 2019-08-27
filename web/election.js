// import JSONFormatter from 'json-formatter-js'
import handlebars from 'handlebars/dist/handlebars.min.js'
// import { utils } from '@iceteachain/web3'
// import tweb3 from './tweb3'
// import { fmtHex, fmtTime } from './helper'
// import { toTEA } from './common'

const candidateTemplate = handlebars.compile(document.getElementById('candidateTemplate').innerHTML)

const fakeObj = [{
  address: 'lang bun phu do',
  name: 'tung duong',
  deposit: '1000 TEA',
  block: '69',
  operator: '+'

}]
document.getElementById('candidates').innerHTML = candidateTemplate(fakeObj)
