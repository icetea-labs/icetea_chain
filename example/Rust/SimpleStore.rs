extern crate js_sys;
extern crate wasm_bindgen;
use wasm_bindgen::prelude::*;

// #[macro_use]
// extern crate serde_derive;

// Import blockchain info
#[wasm_bindgen]
extern {
  fn log(text: &str);
  fn get_sender() -> String;
  fn load(key: &str) -> JsValue;
  fn save(key: &str, value: &JsValue);
  fn json_stringify(value: &JsValue) -> String;
  fn emit_event(name: &str, data: &JsValue, indexes: &JsValue);
}

// Smart contract entry point
#[wasm_bindgen]
pub fn main(operation: &str, params: &JsValue) -> JsValue {
  log(&format!("[RUST] Hello {}, you call method {}", get_sender(), operation));
  match operation {
    "__on_deployed" => {
      save("owner", &JsValue::from_str(&get_sender()));
    },
    "get_value" => {
      return get_value();
    },
    "get_owner" => {
      return get_owner();
    },
    "set_value" => {
      let need_param = js_sys::Reflect::get(params, &JsValue::from_f64(0.0)).unwrap(); // cannot see better way now
      set_value(&need_param);
    },
    &_ => log(&format!("[RUST] Method not found"))
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
pub fn get_owner() -> JsValue {
  return load("owner");
}

#[wasm_bindgen]
pub fn set_value(value: &JsValue) {
  log(&format!("[RUST] set_value: {}", json_stringify(value)));
  save("value", value);
  let event_value = format!("{{\"value\": {}}}", json_stringify(value));
  let event = js_sys::JSON::parse(&event_value).unwrap();
  emit_event("ValueChanged", &event, &js_sys::Array::new());
}
