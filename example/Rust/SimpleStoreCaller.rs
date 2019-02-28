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
  fn load_contract(address: &str) -> JsValue;
}

// Smart contract entry point
#[wasm_bindgen]
pub fn main(operation: &str, param: &JsValue) {
  let params = js_sys::Array::from(param);

  match operation {
    "__on_deployed" => {
      let contract = (js_sys::Reflect::get(&params, &JsValue::from_f64(0.0)).unwrap()).as_string().unwrap();
      save(CONTRACT_KEY, &JsValue::from_str(&contract));
    },
    "set_value" => {
      let need_param = js_sys::Reflect::get(&params, &JsValue::from_f64(0.0)).unwrap();
      set_value(&need_param);
    },
    &_ => log(&format!("[RUST] Method not found"))
  }
}

#[wasm_bindgen]
pub fn set_value(value: &JsValue) {
  let contract_address = load(CONTRACT_KEY).as_string().unwrap();
  let set_fn = load_fn(&contract_address, "set_value");
  set_fn.call1(&JsValue::null(), value).unwrap();
}

fn load_fn(contract_address: &str, name: &str) -> js_sys::Function {
  let contract = load_contract(contract_address);
  let js_fn = js_sys::Reflect::get(&contract, &JsValue::from_str(name)).unwrap();
  let rs_fn = js_sys::Function::try_from(&js_fn);
  match rs_fn {
    Some(x) => x.clone(),
    None    => panic!("contract method not found!")
  }
}