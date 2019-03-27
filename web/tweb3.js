// import { IceTeaWeb3 } from '../tweb3'
import { IceTeaWeb3 } from 'icetea-web3'

// For localhost test, set .env.dev ICETEA_WS = http://localhost:3001/api or ws://localhost:3001/websocket

// NOTE: don't commit public IP to github, even in comment. Put it in env files.

export default window.tweb3 = new IceTeaWeb3(process.env.ICETEA_ENDPOINT)
