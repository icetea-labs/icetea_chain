extern crate futures;
extern crate wasm_bindgen;
extern crate wasm_bindgen_futures;
extern crate icetea_wasm;

use wasm_bindgen::prelude::*;
use icetea_wasm::*;
use wasm_bindgen_futures::{future_to_promise};
use futures::future::ok;

const CONTRACT_KEY: &str = "ck";

// Import blockchain info
#[wasm_bindgen]
extern {
  fn log(text: &str);
  fn get_sender() -> String;
  fn get_address() -> String;
  fn load(key: &str) -> Value;
  fn save(key: &str, value: &Value);
  fn write_contract(address: &str, method: &str, params: Array) -> Value;
}

// Smart contract entry point
#[wasm_bindgen]
pub fn main(operation: &str, value: &Value) -> js_sys::Promise {
  let params = value.as_array();

  match operation {
    "__on_deployed" => {
      let contract = params[0].as_string().unwrap();
      save!(CONTRACT_KEY, contract);
    },
    "set_value" => {
      return set_value(&params[0]);
    },
    &_ => log(&format!("[RUST] Method not found"))
  }

  return js_sys::Promise::resolve(&true.to_value());
}

#[wasm_bindgen]
pub fn set_value(value: &Value) -> js_sys::Promise {
  let contract_address = load!(String, CONTRACT_KEY);
  let future = ok::<Value, Value>(write_contract(&contract_address, "set_value", array!(value)));
  let promise = future_to_promise(future);
  return promise
}
