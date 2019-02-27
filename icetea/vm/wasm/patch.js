const wasm_bindgen = function ({ log, importTableName, save_int, load_int, get_sender, get_address, now, get_block_hash, get_block_number, load_string, save_string, load, save }) { // eslint-disable-line
  var wasm
  const __exports = {}

  let cachedTextDecoder = new TextDecoder('utf-8')

  let cachegetUint8Memory = null
  function getUint8Memory () {
    if (cachegetUint8Memory === null || cachegetUint8Memory.buffer !== wasm.memory.buffer) {
      cachegetUint8Memory = new Uint8Array(wasm.memory.buffer)
    }
    return cachegetUint8Memory
  }

  function getStringFromWasm (ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory().subarray(ptr, ptr + len))
  }

  __exports.__wbg_log_894f9ca062837e26 = function (arg0, arg1) {
    let varg0 = getStringFromWasm(arg0, arg1)
    try {
      log(varg0)
    } catch (e) {
      console.error('wasm-bindgen: imported JS function that was not marked as `catch` threw an error:', e)
      throw e
    }
  }

  let cachedTextEncoder = new TextEncoder('utf-8')

  let WASM_VECTOR_LEN = 0

  function passStringToWasm (arg) {
    if (typeof (arg) !== 'string') throw new Error('expected a string argument')

    const buf = cachedTextEncoder.encode(arg)
    const ptr = wasm.__wbindgen_malloc(buf.length)
    getUint8Memory().set(buf, ptr)
    WASM_VECTOR_LEN = buf.length
    return ptr
  }

  let cachegetUint32Memory = null
  function getUint32Memory () {
    if (cachegetUint32Memory === null || cachegetUint32Memory.buffer !== wasm.memory.buffer) {
      cachegetUint32Memory = new Uint32Array(wasm.memory.buffer)
    }
    return cachegetUint32Memory
  }

  __exports.__wbg_getsender_959abeb9602465cd = function (ret) {
    try {
      const retptr = passStringToWasm(get_sender())
      const retlen = WASM_VECTOR_LEN
      const mem = getUint32Memory()
      mem[ret / 4] = retptr
      mem[ret / 4 + 1] = retlen
    } catch (e) {
      console.error('wasm-bindgen: imported JS function that was not marked as `catch` threw an error:', e)
      throw e
    }
  }

  __exports.__wbg_getaddress_1098b528634273e9 = function (ret) {
    try {
      const retptr = passStringToWasm(get_address())
      const retlen = WASM_VECTOR_LEN
      const mem = getUint32Memory()
      mem[ret / 4] = retptr
      mem[ret / 4 + 1] = retlen
    } catch (e) {
      console.error('wasm-bindgen: imported JS function that was not marked as `catch` threw an error:', e)
      throw e
    }
  }

  __exports.__wbg_now_5511d9fd5212e90b = function (ret) {
    try {
      return now()
    } catch (e) {
      console.error('wasm-bindgen: imported JS function that was not marked as `catch` threw an error:', e)
      throw e
    }
  }

  __exports.__wbg_getblockhash_f43fde2883fc6639 = function (ret) {
    try {
      const retptr = passStringToWasm(get_block_hash())
      const retlen = WASM_VECTOR_LEN
      const mem = getUint32Memory()
      mem[ret / 4] = retptr
      mem[ret / 4 + 1] = retlen
    } catch (e) {
      console.error('wasm-bindgen: imported JS function that was not marked as `catch` threw an error:', e)
      throw e
    }
  }

  __exports.__wbg_getblocknumber_38607e3000e0ef09 = function (ret) {
    try {
      return get_block_number()
    } catch (e) {
      console.error('wasm-bindgen: imported JS function that was not marked as `catch` threw an error:', e)
      throw e
    }
  }

  const heap = new Array(32)

  heap.fill(undefined)

  heap.push(undefined, null, true, false)

  let heap_next = heap.length

  function addHeapObject (obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1)
    const idx = heap_next
    heap_next = heap[idx]

    if (typeof (heap_next) !== 'number') throw new Error('corrupt heap')

    heap[idx] = obj
    return idx
  }

  __exports.__wbg_load_65f8f89efe47e8a7 = function (arg0, arg1) {
    let varg0 = getStringFromWasm(arg0, arg1)
    try {
      return addHeapObject(load(varg0))
    } catch (e) {
      console.error('wasm-bindgen: imported JS function that was not marked as `catch` threw an error:', e)
      throw e
    }
  }

  function getObject (idx) { return heap[idx] }

  __exports.__wbg_save_2747f995ce6b07cb = function (arg0, arg1, arg2) {
    let varg0 = getStringFromWasm(arg0, arg1)
    try {
      save(varg0, getObject(arg2))
    } catch (e) {
      console.error('wasm-bindgen: imported JS function that was not marked as `catch` threw an error:', e)
      throw e
    }
  }

  __exports.__wbg_jsonstringify_8bf98dfd8c0f9963 = function (ret, arg0) {
    try {
      const retptr = passStringToWasm(JSON.stringify(getObject(arg0)))
      const retlen = WASM_VECTOR_LEN
      const mem = getUint32Memory()
      mem[ret / 4] = retptr
      mem[ret / 4 + 1] = retlen
    } catch (e) {
      console.error('wasm-bindgen: imported JS function that was not marked as `catch` threw an error:', e)
      throw e
    }
  }

  let stack_pointer = 32

  function addBorrowedObject (obj) {
    if (stack_pointer == 1) throw new Error('out of js stack')
    heap[--stack_pointer] = obj
    return stack_pointer
  }

  function dropObject (idx) {
    if (idx < 36) return
    heap[idx] = heap_next
    heap_next = idx
  }

  function takeObject (idx) {
    const ret = getObject(idx)
    dropObject(idx)
    return ret
  }

  __exports.main = function (arg0, arg1) {
    const ptr0 = passStringToWasm(arg0)
    const len0 = WASM_VECTOR_LEN
    try {
      return takeObject(wasm.main(ptr0, len0, addBorrowedObject(arg1)))
    } finally {
      wasm.__wbindgen_free(ptr0, len0 * 1)
      heap[stack_pointer++] = undefined
    }
  }

  __exports.__wbg_from_4314bb5c298e92a4 = function (arg0) {
    try {
      return addHeapObject(Array.from(getObject(arg0)))
    } catch (e) {
      console.error('wasm-bindgen: imported JS function that was not marked as `catch` threw an error:', e)
      throw e
    }
  }

  __exports.__wbg_length_434e555f76c0b257 = function (arg0) {
    try {
      return getObject(arg0).length
    } catch (e) {
      console.error('wasm-bindgen: imported JS function that was not marked as `catch` threw an error:', e)
      throw e
    }
  }

  function handleError (exnptr, e) {
    const view = getUint32Memory()
    view[exnptr / 4] = 1
    view[exnptr / 4 + 1] = addHeapObject(e)
  }

  __exports.__wbg_get_e323dac36fd230a3 = function (arg0, arg1, exnptr) {
    try {
      return addHeapObject(Reflect.get(getObject(arg0), getObject(arg1)))
    } catch (e) {
      handleError(exnptr, e)
    }
  }

  function _assertNum (n) {
    if (typeof (n) !== 'number') throw new Error('expected a number argument')
  }

  __exports.__wbg_error_f7214ae7db04600c = function (arg0, arg1) {
    let varg0 = getStringFromWasm(arg0, arg1)

    varg0 = varg0.slice()
    wasm.__wbindgen_free(arg0, arg1 * 1)

    try {
      console.error(varg0)
    } catch (e) {
      console.error('wasm-bindgen: imported JS function that was not marked as `catch` threw an error:', e)
      throw e
    }
  }

  __exports.__wbg_new_a99726b0abef495b = function () {
    try {
      return addHeapObject(new Error())
    } catch (e) {
      console.error('wasm-bindgen: imported JS function that was not marked as `catch` threw an error:', e)
      throw e
    }
  }

  __exports.__wbg_stack_4931b18709aff089 = function (ret, arg0) {
    try {
      const retptr = passStringToWasm(getObject(arg0).stack)
      const retlen = WASM_VECTOR_LEN
      const mem = getUint32Memory()
      mem[ret / 4] = retptr
      mem[ret / 4 + 1] = retlen
    } catch (e) {
      console.error('wasm-bindgen: imported JS function that was not marked as `catch` threw an error:', e)
      throw e
    }
  }

  __exports.__wbindgen_object_drop_ref = function (i) { dropObject(i) }

  __exports.__wbindgen_string_new = function (p, l) {
    return addHeapObject(getStringFromWasm(p, l))
  }

  __exports.__wbindgen_string_get = function (i, len_ptr) {
    let obj = getObject(i);
    if (typeof(obj) !== 'string') return 0;
    const ptr = passStringToWasm(obj);
    getUint32Memory()[len_ptr / 4] = WASM_VECTOR_LEN;
    return ptr;
  }

  __exports.__wbindgen_boolean_new = function (v) {
    return addHeapObject(v === 1)
  }

  __exports.__wbindgen_number_new = function (i) {
    return addHeapObject(i)
  }

  __exports.__wbindgen_number_get = function (n, invalid) {
    let obj = getObject(n)
    if (typeof (obj) === 'number') { return obj }
    getUint8Memory()[invalid] = 1
    return 0
  }

  __exports.__wbindgen_json_serialize = function (idx, ptrptr) {
    const ptr = passStringToWasm(JSON.stringify(getObject(idx)))
    getUint32Memory()[ptrptr / 4] = ptr
    return WASM_VECTOR_LEN
  }

  __exports.__wbindgen_json_parse = function (ptr, len) {
    return addHeapObject(JSON.parse(getStringFromWasm(ptr, len)));
  }

  __exports.__wbindgen_debug_string = function (i, len_ptr) {
    const toString = Object.prototype.toString
    const debug_str = val => {
      // primitive types
      const type = typeof val
      if (type == 'number' || type == 'boolean' || val == null) {
        return `${val}`
      }
      if (type == 'string') {
        return `"${val}"`
      }
      if (type == 'symbol') {
        const description = val.description
        if (description == null) {
          return 'Symbol'
        } else {
          return `Symbol(${description})`
        }
      }
      if (type == 'function') {
        const name = val.name
        if (typeof name === 'string' && name.length > 0) {
          return `Function(${name})`
        } else {
          return 'Function'
        }
      }
      // objects
      if (Array.isArray(val)) {
        const length = val.length
        let debug = '['
        if (length > 0) {
          debug += debug_str(val[0])
        }
        for (let i = 1; i < length; i++) {
          debug += ', ' + debug_str(val[i])
        }
        debug += ']'
        return debug
      }
      // Test for built-in
      const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val))
      let className
      if (builtInMatches.length > 1) {
        className = builtInMatches[1]
      } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val)
      }
      if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
          return 'Object(' + JSON.stringify(val) + ')'
        } catch (_) {
          return 'Object'
        }
      }
      // errors
      if (val instanceof Error) {
        return `${val.name}: ${val.message}
        ${val.stack}`
      }
      // TODO we could test for more things here, like `Set`s and `Map`s.
      return className
    }
    const val = getObject(i)
    const debug = debug_str(val)
    const ptr = passStringToWasm(debug)
    getUint32Memory()[len_ptr / 4] = WASM_VECTOR_LEN
    return ptr
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
