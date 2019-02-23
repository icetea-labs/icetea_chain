import tweb3 from './tweb3'

async function testGetContracts () {
  console.log(await tweb3.getContracts())
}

testGetContracts()
