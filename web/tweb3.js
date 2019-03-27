// import { IceTeaWeb3 } from '../tweb3'
import { IceTeaWeb3 } from 'icetea-web3'
// export default window.tweb3 = new IceTeaWeb3('http://localhost:3001/api');
// let socket = process.env.NODE_ENV === 'production' ? 'ws://178.128.58.128/websocket' : 'ws://localhost:26657/websocket'
export default window.tweb3 = new IceTeaWeb3(process.env.ICETEA_ENDPOINT)
