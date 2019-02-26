const wasm_bindgen = function ({ log, importTableName, save_int, load_int, get_sender, get_address, now, get_block_hash, get_block_number, load_string, save_string, load, save }) { // eslint-disable-line
  var wasm
  const __exports = {}

  let cachedDecoder = new TextDecoder('utf-8')

  let cachegetUint8Memory = null
  function getUint8Memory () {
    if (cachegetUint8Memory === null ||
        cachegetUint8Memory.buffer !== wasm.memory.buffer) { cachegetUint8Memory = new Uint8Array(wasm.memory.buffer) }
    return cachegetUint8Memory
  }

  function getStringFromWasm (ptr, len) {
    return cachedDecoder.decode(getUint8Memory().subarray(ptr, ptr + len))
  }

  __exports.__wbg_f_log_log_n = function (arg0, arg1) {
    let varg0 = getStringFromWasm(arg0, arg1)
    log(varg0)
  }

  let cachedEncoder = new TextEncoder('utf-8')

  function passStringToWasm (arg) {
    const buf = cachedEncoder.encode(arg)
    const ptr = wasm.__wbindgen_malloc(buf.length)
    getUint8Memory().set(buf, ptr)
    return [ptr, buf.length]
  }

  let cachegetUint32Memory = null
  function getUint32Memory () {
    if (cachegetUint32Memory === null ||
        cachegetUint32Memory.buffer !== wasm.memory.buffer) { cachegetUint32Memory = new Uint32Array(wasm.memory.buffer) }
    return cachegetUint32Memory
  }

  __exports.__wbg_f_get_sender_get_sender_n = function (ret) {
    const [retptr, retlen] = passStringToWasm(get_sender())
    const mem = getUint32Memory()
    mem[ret / 4] = retptr
    mem[ret / 4 + 1] = retlen
  }

  __exports.__wbg_f_get_address_get_address_n = function (ret) {
    const [retptr, retlen] = passStringToWasm(get_address())
    const mem = getUint32Memory()
    mem[ret / 4] = retptr
    mem[ret / 4 + 1] = retlen
  }

  __exports.__wbg_f_load_int_load_int_n = function (arg0, arg1) {
    let varg0 = getStringFromWasm(arg0, arg1)
    return load_int(varg0)
  }

  __exports.__wbg_f_save_int_save_int_n = function (arg0, arg1, arg2) {
    let varg0 = getStringFromWasm(arg0, arg1)
    save_int(varg0, arg2)
  }

  __exports.__wbg_f_now_now_n = function () {
    return now()
  }

  __exports.__wbg_f_get_block_hash_get_block_hash_n = function (ret) {
    const [retptr, retlen] = passStringToWasm(get_block_hash())
    const mem = getUint32Memory()
    mem[ret / 4] = retptr
    mem[ret / 4 + 1] = retlen
  }

  __exports.__wbg_f_get_block_number_get_block_number_n = function () {
    return get_block_number()
  }

  __exports.__wbg_f_load_string_load_string_n = function (ret, arg0, arg1) {
    let varg0 = getStringFromWasm(arg0, arg1)
    const [retptr, retlen] = passStringToWasm(load_string(varg0))
    const mem = getUint32Memory()
    mem[ret / 4] = retptr
    mem[ret / 4 + 1] = retlen
  }

  __exports.__wbg_f_save_string_save_string_n = function (arg0, arg1, arg2, arg3) {
    let varg0 = getStringFromWasm(arg0, arg1)
    let varg2 = getStringFromWasm(arg2, arg3)
    varg2 = varg2.slice()
    wasm.__wbindgen_free(arg2, arg3 * 1)
    save_string(varg0, varg2)
  }

  __exports.__wbg_f_json_stringify_json_stringify_n = function (ret, arg0) {
    const [retptr, retlen] = passStringToWasm(JSON.stringify(getObject(arg0)))
    const mem = getUint32Memory()
    mem[ret / 4] = retptr
    mem[ret / 4 + 1] = retlen
  }

  let slab = []

  let slab_next = 0

  function addHeapObject (obj) {
    if (slab_next === slab.length) { slab.push(slab.length + 1) }
    const idx = slab_next
    const next = slab[idx]

    slab_next = next

    slab[idx] = { obj, cnt: 1 }
    return idx << 1
  }

  __exports.__wbg_f_load_load_n = function (arg0, arg1) {
    let varg0 = getStringFromWasm(arg0, arg1)
    return addHeapObject(load(varg0))
  }

  let stack = []

  function getObject (idx) {
    if ((idx & 1) === 1) {
      return stack[idx >> 1]
    } else {
      const val = slab[idx >> 1]

      return val.obj
    }
  }

  __exports.__wbg_f_save_save_n = function (arg0, arg1, arg2) {
    let varg0 = getStringFromWasm(arg0, arg1)
    save(varg0, getObject(arg2))
  }

  function addBorrowedObject (obj) {
    stack.push(obj)
    return ((stack.length - 1) << 1) | 1
  }

  function dropRef (idx) {
    let obj = slab[idx >> 1]

    obj.cnt -= 1
    if (obj.cnt > 0) { return }

    // If we hit 0 then free up our space in the slab
    slab[idx >> 1] = slab_next
    slab_next = idx >> 1
  }

  function takeObject (idx) {
    const ret = getObject(idx)
    dropRef(idx)
    return ret
  }

  __exports.main = function (arg0, arg1) {
    const [ptr0, len0] = passStringToWasm(arg0)
    try {
      return takeObject(wasm.main(ptr0, len0, addBorrowedObject(arg1)))
    } finally {
      wasm.__wbindgen_free(ptr0, len0 * 1)
      stack.pop()
    }
  }

  __exports.__wbindgen_object_drop_ref = function (i) { dropRef(i) }

  __exports.__wbindgen_string_new = function (p, l) {
    return addHeapObject(getStringFromWasm(p, l))
  }

  __exports.__wbindgen_boolean_new = function (v) {
    return addHeapObject(v === 1)
  }

  __exports.__wbindgen_string_get = function (i, len_ptr) {
    let obj = getObject(i)
    if (typeof (obj) !== 'string') { return 0 }
    const [ptr, len] = passStringToWasm(obj)
    getUint32Memory()[len_ptr / 4] = len
    return ptr
  }

  __exports.__wbindgen_number_get = function (n, invalid) {
    let obj = getObject(n)
    if (typeof (obj) === 'number') { return obj }
    getUint8Memory()[invalid] = 1
    return 0
  }

  __exports.__wbindgen_throw = function (ptr, len) {
    throw new Error(getStringFromWasm(ptr, len))
  }

  function init (buffer) {
    // console.log({ [importTableName]: __exports });
    return global.WebAssembly.instantiate(buffer, { [importTableName]: __exports })
      .then(({ instance }) => {
        wasm = init.wasm = instance.exports
      })
  };

  return Object.assign(init, __exports)
}

module.exports = (wasmBuffer) => {
  return async (ctx) => {
    var bindgen = wasm_bindgen(ctx)
    return bindgen(wasmBuffer).then(() => {
      return bindgen.main(ctx.get_msg_name(), ctx.get_msg_param())
    })
  }
}
