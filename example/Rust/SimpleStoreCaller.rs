extern crate wasm_bindgen;
extern crate icetea_wasm;
extern crate js_sys;

use wasm_bindgen::prelude::*;
use icetea_wasm::*;

const CONTRACT_KEY: &str = "ck";

// Import blockchain info
#[wasm_bindgen]
extern {
  fn load(key: &str) -> Value;
  fn save(key: &str, value: &Value);
  fn write_contract(address: &str, method: &str, params: Array) -> Value;
}

// Smart contract entry point
#[wasm_bindgen]
pub fn main(operation: &str, value: &Value) -> Value {
  let params = value.as_array();

  match operation {
    "__on_deployed" => {
      let contract = params[0].as_string().unwrap();
      save!(CONTRACT_KEY, contract);
    },
    "set_value" => {
      set_value(&params[0]);
    },
    &_ => { return false.to_value(); }
  }

  return true.to_value();
}

#[wasm_bindgen]
pub fn set_value(value: &Value) {
  let contract_address = load!(String, CONTRACT_KEY);
  write_contract(&contract_address, "set_value", array!(value));
}
