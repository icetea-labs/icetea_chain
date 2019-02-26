// Current prelude for using `wasm_bindgen`, and this'll get smaller over time!
#![feature(proc_macro, wasm_custom_section, wasm_import_module)]
extern crate wasm_bindgen;
use wasm_bindgen::prelude::*;

// Import blockchain info
#[wasm_bindgen]
extern {
    fn log(text: &str);
    fn get_sender() -> String;
    fn load(key: &str) -> JsValue;
    fn save(key: &str, value: &JsValue);
    fn json_stringify(value: &JsValue) -> String;
}

// Smart contract entry point
#[wasm_bindgen]
pub fn main(operation: &str, param: &JsValue) -> JsValue {
    log(&format!("[RUST] Hello {}, you call method {}", get_sender(), operation));
    if operation == "get_value" {
      return get_value();
    } else if operation == "set_value" {
      set_value(param);
    }
    return JsValue::from_bool(true);
}

#[wasm_bindgen]
pub fn get_value() -> JsValue {
  let v = load("value");
  log(&format!("[RUST] get_value: {}", json_stringify(&v)));
  return v;
}

#[wasm_bindgen]
pub fn set_value(value: &JsValue) {
  log(&format!("[RUST] set_value: {}", json_stringify(value)));
  save("value", value);
}
