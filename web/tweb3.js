// import { IceteaWeb3 } from '../tweb3'
import { IceteaWeb3 } from '@iceteachain/web3'

// For localhost test, set .env.dev ICETEA_WS = http://localhost:3001/api or ws://localhost:3001/websocket

// NOTE: don't commit public IP to github, even in comment. Put it in env files.

export default window.tweb3 = new IceteaWeb3(process.env.ICETEA_ENDPOINT)
