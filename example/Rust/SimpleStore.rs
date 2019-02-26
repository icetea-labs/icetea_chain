// Current prelude for using `wasm_bindgen`, and this'll get smaller over time!
#![feature(proc_macro, wasm_custom_section, wasm_import_module)]
extern crate wasm_bindgen;
use wasm_bindgen::prelude::*;

// Import blockchain info
#[wasm_bindgen]
extern {
    fn log(text: &str);
    fn get_sender() -> String;
    fn load_int(key: &str) -> i32;
    fn save_int(key: &str, value: i32);
}

// Smart contract entry point
#[wasm_bindgen]
pub fn main(operation: &str, param: i32) -> i32 {
    log(&format!("[RUST] Hello {}, you call method {}", get_sender(), operation));
    if operation == "get_value" {
      return get_value();
    } else if operation == "set_value" {
      set_value(param);
    }
    return 0;
}

#[wasm_bindgen]
pub fn get_value() -> i32 {
  let v = load_int("value");
  log(&format!("[RUST] get_value: {}", v));
  return v;
}

#[wasm_bindgen]
pub fn set_value(value: i32) {
  log(&format!("[RUST] set_value: {}", value));
  save_int("value", value);
}
