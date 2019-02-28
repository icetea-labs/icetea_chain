extern crate wasm_bindgen;
use wasm_bindgen::prelude::*;

// Import blockchain info
#[wasm_bindgen]
extern {
  fn log(text: &str);
  fn get_sender() -> String;
  fn get_address() -> String;
}

// Smart contract entry point
#[wasm_bindgen]
pub fn main(operation: &str) {
  if operation == "test" {
    test();
  }
}

#[wasm_bindgen]
pub fn test() {
  log(&format!("[RUST] Called from {}, I am {}", get_sender(), get_address()));
}