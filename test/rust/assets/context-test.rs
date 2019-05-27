extern crate icetea_wasm;
extern crate js_sys;
extern crate wasm_bindgen;

use wasm_bindgen::prelude::*;
use icetea_wasm::*;

#[wasm_bindgen]
extern {
  fn log(text: &str);
  fn get_sender() -> String;
  fn get_address() -> String;
  fn get_block_hash() -> String;
  fn get_balance() -> Value;
  fn get_block_number() -> u32;
  fn now() -> u32;
  fn save(key: &str, value: &Value);
}

// Smart contract entry point
#[wasm_bindgen]
pub fn main(operation: &str, value: &Value) -> Value {
  let params = value.as_array();
  match operation {
    "__on_deployed" => {
      save("owner", &Value::from_str(&get_sender()));
    },
    "__on_received" => {
      return Value::from_bool(true);
    },
    "get_sender" => {
      return get_sender().to_value();
    },
    "get_address" => {
      return get_address().to_value();
    },
    "get_block_hash" => {
      return get_block_hash().to_value();
    },
    "get_block_number" => {
      return get_block_number().to_value();
    },
    "now" => {
      return now().to_value();
    },
    "get_balance" => {
      return get_balance();
    },
    &_ => panic!("[RUST] Method not found")
  }
  return Value::from_bool(true);
}
