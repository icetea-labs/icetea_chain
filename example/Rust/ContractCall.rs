extern crate wasm_bindgen;
extern crate icetea_wasm;
extern crate console_error_panic_hook;
use wasm_bindgen::prelude::*;
use icetea_wasm::*;

const CONTRACT_KEY: &str = "ck";

// Import blockchain info
#[wasm_bindgen]
extern {
  fn log(text: &str);
  fn get_sender() -> String;
  fn get_address() -> String;
  fn load(key: &str) -> Value;
  fn save(key: &str, value: &Value);
  fn read_contract(address: &str, method: &str, params: Array) -> Value;
}

// Smart contract entry point
#[wasm_bindgen]
pub fn main(operation: &str, value: &Value) {
  console_error_panic_hook::set_once();
  let params = value.as_array();

  match operation {
    "__on_deployed" => {
      let contract = params[0].as_string().unwrap();
      save!(CONTRACT_KEY, contract);
    },
    "test" => test(),
    &_ => log(&format!("[RUST] Method not found"))
  }
}

#[wasm_bindgen]
pub fn test() {
  let contract_address = load!(String, CONTRACT_KEY);
  log(&format!("I am {}, calling {}", get_address(), &contract_address));
  read_contract(&contract_address, "test", array!());
}