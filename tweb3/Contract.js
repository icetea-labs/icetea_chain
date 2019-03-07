const ecc = require('../icetea/helper/ecc');
const { TxOp } = require('../icetea/enum');

class Contract {
    constructor(tweb3, address, privateKey) {
      // this.iweb3 = iweb3;
      // this.address = address;
      this.methods = new Proxy({}, {
        get: function(obj, name) {
          return {
            call: function (method, params = [], options = {}) {
              return tweb3.callReadonlyContractMethod(address, method, params, options);
            },
            sendAsync: function (method, params, options) {
              var tx = this._serializeData(method, params, options, privateKey);
              return tweb3.sendTransactionAsync(tx, privateKey);
            },
            sendSync: function (method, params, options) {
              var tx = this._serializeData(method, params, options, privateKey);
              return tweb3.sendTransactionSync(tx, privateKey);
            },
            sendCommit: function (method, params, options) {
              var tx = this._serializeData(method, params, options, privateKey);
              return tweb3.sendTransactionCommit(tx, privateKey);
            },
            _serializeData: function (method, params=[], options = {}, privateKey){
              var formData = {};
              var txData = {
                  op: TxOp.CALL_CONTRACT,
                  name: method,
                  params: params
              }
              formData.from = ecc.toPublicKey(privateKey);
              formData.to = address;
              formData.value = options.value || 0;
              formData.fee = options.fee || 0;
              formData.data = txData;
              return formData;
            }
          }
        },
        set: function() {
          throw new Error('Cannot change methods.')
        }
      });
    }
}

module.exports = Contract;