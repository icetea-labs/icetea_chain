const wasm_bindgen = function (ctx) {
  var wasm;
  const __exports = {};


  __exports.__wbg_f_getAddress_getAddress_n = function () {
    getAddress();
  };

  __exports.__wbg_f_getBalance_getBalance_n = function () {
    getBalance();
  };

  __exports.__wbg_f_getSender_getSender_n = function () {
    getSender();
  };

  __exports.__wbg_f_getTimestamp_getTimestamp_n = function () {
    getTimestamp();
  };

  __exports.__wbg_f_getState_getState_n = function () {
    getState();
  };

  let cachedDecoder = new TextDecoder('utf-8');

  let cachegetUint8Memory = null;
  function getUint8Memory() {
    if (cachegetUint8Memory === null ||
      cachegetUint8Memory.buffer !== wasm.memory.buffer)
      cachegetUint8Memory = new Uint8Array(wasm.memory.buffer);
    return cachegetUint8Memory;
  }

  function getStringFromWasm(ptr, len) {
    return cachedDecoder.decode(getUint8Memory().subarray(ptr, ptr + len));
  }

  __exports.__wbg_f_setState_setState_n = function (arg0, arg1) {
    let varg0 = getStringFromWasm(arg0, arg1);
    setState(varg0);
  };

  let cachedEncoder = new TextEncoder('utf-8');

  function passStringToWasm(arg) {

    const buf = cachedEncoder.encode(arg);
    const ptr = wasm.__wbindgen_malloc(buf.length);
    getUint8Memory().set(buf, ptr);
    return [ptr, buf.length];
  }

  let cachedGlobalArgumentPtr = null;
  function globalArgumentPtr() {
    if (cachedGlobalArgumentPtr === null)
      cachedGlobalArgumentPtr = wasm.__wbindgen_global_argument_ptr();
    return cachedGlobalArgumentPtr;
  }

  let cachegetUint32Memory = null;
  function getUint32Memory() {
    if (cachegetUint32Memory === null ||
      cachegetUint32Memory.buffer !== wasm.memory.buffer)
      cachegetUint32Memory = new Uint32Array(wasm.memory.buffer);
    return cachegetUint32Memory;
  }

  __exports.main = function (arg0) {
    const [ptr0, len0] = passStringToWasm(arg0);
    const retptr = globalArgumentPtr();
    try {
      wasm.main(retptr, ptr0, len0);
      const mem = getUint32Memory();
      const ptr = mem[retptr / 4];
      const len = mem[retptr / 4 + 1];
      const realRet = getStringFromWasm(ptr, len).slice();
      wasm.__wbindgen_free(ptr, len * 1);
      //console.log("main() returns", realRet)
      return realRet;
    } finally {
      wasm.__wbindgen_free(ptr0, len0 * 1);
    }
  };

  __exports.__wbindgen_throw = function (ptr, len) {
    throw new Error(getStringFromWasm(ptr, len));
  };


  function extractImportName(buffer) {
    const start = 70;
    const len = 19;
    const result = buffer.toString('utf-8', start, start + len).replace(/[\W]+/g, "");
    return "./" + result;
  }

  function init(buffer) {
    const importName = extractImportName(buffer);
    //console.log({ [importName]: __exports });
    return WebAssembly.instantiate(buffer, { [importName]: __exports })
      .then(({ instance }) => {
        wasm = init.wasm = instance.exports;
        return;
      });
  };

  return Object.assign(init, __exports);
};

module.exports = (wasmBuffer) => {
  return async (ctx) => {
    var bindgen = wasm_bindgen(ctx);
    return await bindgen(wasmBuffer).then(() => {
      return bindgen.main(ctx.getMsgName());
    });
  }
}
