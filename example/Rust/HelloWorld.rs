// Current prelude for using `wasm_bindgen`, and this'll get smaller over time!
#![feature(proc_macro, wasm_custom_section, wasm_import_module)]
extern crate wasm_bindgen;
use wasm_bindgen::prelude::*;

// Import blockchain info
#[wasm_bindgen]
extern {
  fn log(text: &str);
  fn get_sender() -> String;
  fn get_address() -> String;
  fn now() -> i32;
  fn get_block_hash() -> String;
}

// Smart contract entry point
#[wasm_bindgen]
pub fn main(operation: &str) {
  if operation == "hello" {
    hello();
  }
}

#[wasm_bindgen]
pub fn hello() {
  log(&format!("[RUST] Hello {} from {}", get_sender(), get_address()));
  log(&format!("This block is mined at {}", now()));
  log(&format!("The block hash is {}", get_block_hash()));
}