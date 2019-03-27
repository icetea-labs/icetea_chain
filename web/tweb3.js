// import { IceTeaWeb3 } from '../tweb3'
import { IceTeaWeb3 } from 'icetea-web3'
export default window.tweb3 = new IceTeaWeb3(window.location.protocol + '//localhost:3001/api')
// export default window.tweb3 = new IceTeaWeb3('ws://localhost:26657/websocket')
