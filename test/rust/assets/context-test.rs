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
  fn get_msg_value() -> Value;
  fn get_msg_fee() -> Value;
  fn get_block_number() -> u32;
  fn now() -> u32;
  fn load(key: &str) -> Value;
  fn save(key: &str, value: &Value);
  fn transfer(to: &str, value: u64);
  fn has_state(to: &str) -> bool;
  fn delete_state(to: &str);
  fn read_contract(address: &str, method: &str, params: Array) -> Value;
}

const CONTRACT_KEY: &str = "ck";

// Smart contract entry point
#[wasm_bindgen]
pub fn main(operation: &str, value: &Value) -> Value {
  let params = value.as_array();
  match operation {
    "__on_deployed" => {
      if params.len() == 1 {
        let contract = params[0].as_string().unwrap();
        save!(CONTRACT_KEY, contract);
      }
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
    "transfer" => {
      let to = params[0].as_string().unwrap();
      let value = params[1].as_u64().unwrap();
      transfer(&to, value);
      return Value::from_bool(true);
    },
    "get_msg_value" => {
      return get_msg_value();
    },
    "get_msg_fee" => {
      return get_msg_fee();
    },
    "has_state" => {
      let name = params[0].as_string().unwrap();
      return has_state(&name).to_value();
    },
    "other_has_state" => {
      let name = params[0].as_string().unwrap();
      let contract_address = load!(String, CONTRACT_KEY);
      return read_contract(&contract_address, "has_state", array!(&name.to_value()))
    },
    "delete_state" => {
      let name = params[0].as_string().unwrap();
      delete_state(&name);
      return Value::from_bool(true);
    },
    "pure_get_sender" => {
      return get_sender().to_value();
    },
    &_ => {
      log(&format!("[RUST] Method {} not found", operation));
      return Value::from_bool(false);
    }
  }
  return Value::from_bool(false);
}
