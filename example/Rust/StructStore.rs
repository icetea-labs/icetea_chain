extern crate js_sys;
extern crate wasm_bindgen;
use wasm_bindgen::prelude::*;

#[macro_use]
extern crate serde_derive;

// Import blockchain info
#[wasm_bindgen]
extern {
  fn log(text: &str);
  fn get_sender() -> String;
  fn load(key: &str) -> JsValue;
  fn save(key: &str, value: &JsValue);
  fn json_stringify(value: &JsValue) -> String;
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Example {
  pub number: f64,
  pub string: String
}

// Smart contract entry point
#[wasm_bindgen]
pub fn main(operation: &str, param: &JsValue) -> JsValue {
  log(&format!("[RUST] Hello {}, you call method {}", get_sender(), operation));
  let params = js_sys::Array::from(param);

  if operation == "__on_deployed" {
    let value = JsValue::from_serde(&Example{number: 0.0, string: "".to_string()}).unwrap();
    save("value", &value);
  } else if operation == "get_value" {
    return get_value();
  } else if operation == "set_value" {
    if params.length() >= 2 {
      let params0 = js_sys::Reflect::get(&params, &JsValue::from_f64(0.0)).unwrap();
      let params1 = js_sys::Reflect::get(&params, &JsValue::from_f64(1.0)).unwrap();
      let number = params0.as_f64().unwrap();
      let string = params1.as_string().unwrap();
      set_value(number, string);
    }
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
pub fn set_value(number: f64, string: String) {
  log(&format!("[RUST] set_value: {} {}", number, string));
  let value = JsValue::from_serde(&Example{number: number, string: string}).unwrap();
  save("value", &value);
}
