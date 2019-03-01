extern crate wasm_bindgen;
use wasm_bindgen::prelude::*;

const CONTRACT_KEY: &str = "ck";

// Import blockchain info
#[wasm_bindgen]
extern {
  fn log(text: &str);
  fn get_sender() -> String;
  fn get_address() -> String;
  fn load(key: &str) -> JsValue;
  fn save(key: &str, value: &JsValue);
  fn call_contract(address: &str, method: &str, params: js_sys::Array) -> JsValue;
}

// Smart contract entry point
#[wasm_bindgen]
pub fn main(operation: &str, param: &JsValue) -> JsValue {
  let params = js_sys::Array::from(param);

  match operation {
    "__on_deployed" => {
      let contract = (js_sys::Reflect::get(&params, &JsValue::from_f64(0.0)).unwrap()).as_string().unwrap();
      save(CONTRACT_KEY, &JsValue::from_str(&contract));
    },
    "set_value" => {
      let need_param = js_sys::Reflect::get(&params, &JsValue::from_f64(0.0)).unwrap();
      return set_value(&need_param);
    },
    &_ => log(&format!("[RUST] Method not found"))
  }

  return JsValue::from_bool(true);
}

#[wasm_bindgen]
pub fn set_value(value: &JsValue) -> JsValue {
  let contract_address = load(CONTRACT_KEY).as_string().unwrap();
  let params = js_sys::Array::new();
  params.push(value);
  return call_contract(&contract_address, "set_value", params);
}