extern crate futures;
extern crate wasm_bindgen;
extern crate wasm_bindgen_futures;

use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::{future_to_promise};
use futures::future::ok;

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
pub fn main(operation: &str, param: &JsValue) -> js_sys::Promise {
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

  // return JsFuture::from(js_sys::Promise::resolve(&JsValue::NULL));
  return js_sys::Promise::resolve(&JsValue::from_bool(true));
}

#[wasm_bindgen]
pub fn set_value(value: &JsValue) -> js_sys::Promise {
  let contract_address = load(CONTRACT_KEY).as_string().unwrap();
  let params = js_sys::Array::new();
  params.push(value);
  let future = ok::<JsValue, JsValue>(call_contract(&contract_address, "set_value", params));
  let promise = future_to_promise(future);
  return promise
}
