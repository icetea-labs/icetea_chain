extern crate js_sys;
extern crate console_error_panic_hook;
extern crate wasm_bindgen;
use wasm_bindgen::prelude::*;

// #[macro_use]
// extern crate serde_derive;

// Import blockchain info
#[wasm_bindgen]
extern {
  fn log(text: &str);
  fn get_sender() -> String;
  fn get_msg_value() -> f64;
  fn load(key: &str) -> JsValue;
  fn save(key: &str, value: &JsValue);
  fn json_stringify(value: &JsValue) -> String;
}

const BALANCE_KEY: &str = "bk";
const TOTAL_SUPPLY_KEY: &str = "tsk";
const ALLOW_KEY: &str = "ak";

// Smart contract entry point
#[wasm_bindgen]
pub fn main(operation: &str, param: &JsValue) -> JsValue {
  console_error_panic_hook::set_once();
  log(&format!("[RUST] Hello {}, you call method {}", get_sender(), operation));
  let params = js_sys::Array::from(param);

  match operation {
    "__on_deployed" => {
      let sender = get_sender();
      _mint(&sender, 1000000000.0);
    },
    "balance_of" => {
      let owner = (js_sys::Reflect::get(&params, &JsValue::from_f64(0.0)).unwrap()).as_string().unwrap();
      return JsValue::from_f64(balance_of(&owner));
    },
    "total_supply" => {
      return JsValue::from_f64(total_supply());
    },
    "allowance" => {
      let owner = (js_sys::Reflect::get(&params, &JsValue::from_f64(0.0)).unwrap()).as_string().unwrap();
      let spender = (js_sys::Reflect::get(&params, &JsValue::from_f64(1.0)).unwrap()).as_string().unwrap();
      return JsValue::from_f64(allowance(&owner, &spender));
    }
    "transfer" => {
      let to = (js_sys::Reflect::get(&params, &JsValue::from_f64(0.0)).unwrap()).as_string().unwrap();
      let value = (js_sys::Reflect::get(&params, &JsValue::from_f64(1.0)).unwrap()).as_f64().unwrap();
      return JsValue::from_bool(transfer(&to, value));
    },
    "approve" => {
      let spender = (js_sys::Reflect::get(&params, &JsValue::from_f64(0.0)).unwrap()).as_string().unwrap();
      let value = (js_sys::Reflect::get(&params, &JsValue::from_f64(1.0)).unwrap()).as_f64().unwrap();
      return JsValue::from_bool(approve(&spender, value));
    },
    "transfer_from" => {
      let from = (js_sys::Reflect::get(&params, &JsValue::from_f64(0.0)).unwrap()).as_string().unwrap();
      let to = (js_sys::Reflect::get(&params, &JsValue::from_f64(1.0)).unwrap()).as_string().unwrap();
      let value = (js_sys::Reflect::get(&params, &JsValue::from_f64(2.0)).unwrap()).as_f64().unwrap();
      return JsValue::from_bool(transfer_from(&from, &to, value));
    },
    "increase_allowance" => {
      let spender = (js_sys::Reflect::get(&params, &JsValue::from_f64(0.0)).unwrap()).as_string().unwrap();
      let value = (js_sys::Reflect::get(&params, &JsValue::from_f64(1.0)).unwrap()).as_f64().unwrap();
      return JsValue::from_bool(increase_allowance(&spender, value));
    },
    "decrease_allowance" => {
      let spender = (js_sys::Reflect::get(&params, &JsValue::from_f64(0.0)).unwrap()).as_string().unwrap();
      let value = (js_sys::Reflect::get(&params, &JsValue::from_f64(1.0)).unwrap()).as_f64().unwrap();
      return JsValue::from_bool(decrease_allowance(&spender, value));
    },
    &_ => log(&format!("[RUST] Method not found"))
  }

  return JsValue::from_bool(true);
}

#[wasm_bindgen]
pub fn total_supply() -> f64 {
  let total_supply = load(TOTAL_SUPPLY_KEY).as_f64().unwrap();
  return total_supply;
}

#[wasm_bindgen]
pub fn balance_of(owner: &str) -> f64 {
  let balance = load(&format!("{}{}", BALANCE_KEY, owner)).as_f64().unwrap();
  return balance;
}

#[wasm_bindgen]
pub fn allowance(owner: &str, spender: &str) -> f64 {
  let allow = load(&format!("{}{}{}", ALLOW_KEY, owner, spender)).as_f64().unwrap();
  return allow;
}

#[wasm_bindgen]
pub fn transfer(to: &str, value: f64) -> bool {
  let sender = get_sender();
  _transfer(&sender, to, value);
  return true;
}

#[wasm_bindgen]
pub fn approve(spender: &str, value: f64) -> bool {
  let sender = get_sender();
  _approve(&sender, spender, value);
  return true;
}

#[wasm_bindgen]
pub fn transfer_from(from: &str, to: &str, value: f64) -> bool {
  let sender = get_sender();
  let allow = allowance(from, &sender);
  _transfer(from, to, value);
  _approve(from, &sender, allow - value);
  return true;
}

#[wasm_bindgen]
pub fn increase_allowance(spender: &str, add_value: f64) -> bool {
  let sender = get_sender();
  let allow = allowance(&sender, spender);
  _approve(&sender, spender, allow + add_value);
  return true;
}

#[wasm_bindgen]
pub fn decrease_allowance(spender: &str, subtracted_value: f64) -> bool {
  let sender = get_sender();
  let allow = allowance(&sender, spender);
  _approve(&sender, spender, allow - subtracted_value);
  return true;
}

fn _transfer(from: &str, to: &str, value: f64) {
  if to == "".to_string() {
    panic!("invalid to address!");
  }
  if value < 0.0 {
    panic!("negative value!");
  }

  let mut from_balance = load(&format!("{}{}", BALANCE_KEY, from)).as_f64().unwrap();
  from_balance -= value;
  if from_balance < 0.0 {
    panic!("sender balance is not enough!");
  }
  save(&format!("{}{}", BALANCE_KEY, from), &JsValue::from_f64(from_balance));

  let mut to_balance = load(&format!("{}{}", BALANCE_KEY, to)).as_f64().unwrap();
  to_balance += value;
  save(&format!("{}{}", BALANCE_KEY, to), &JsValue::from_f64(to_balance));
}

fn _approve(owner: &str, spender: &str, value: f64) {
  if owner == "".to_string() || spender == "".to_string() {
    panic!("invalid address!");
  }
  if value < 0.0 {
    panic!("negative value!");
  }
  save(&format!("{}{}{}", ALLOW_KEY, owner, spender), &JsValue::from_f64(value));
}

fn _mint(account: &str, value: f64) {
  if account == "".to_string() {
    panic!("invalid address!");
  }
  if value < 0.0 {
    panic!("negative value!");
  }

  let mut total_supply = load(TOTAL_SUPPLY_KEY).as_f64().unwrap();
  let mut balance = load(&format!("{}{}", BALANCE_KEY, account)).as_f64().unwrap();
  total_supply += value;
  balance += value;
  save(TOTAL_SUPPLY_KEY, &JsValue::from_f64(total_supply));
  save(&format!("{}{}", BALANCE_KEY, account), &JsValue::from_f64(balance));
}

fn _burn(account: &str, value: f64) {
  if account == "".to_string() {
    panic!("invalid address!");
  }
  if value < 0.0 {
    panic!("negative value!");
  }

  let mut total_supply = load(TOTAL_SUPPLY_KEY).as_f64().unwrap();
  let mut balance = load(&format!("{}{}", BALANCE_KEY, account)).as_f64().unwrap();
  total_supply -= value;
  balance -= value;

  if total_supply < 0.0 || balance < 0.0 {
    panic!("negative value!");
  }

  save(TOTAL_SUPPLY_KEY, &JsValue::from_f64(total_supply));
  save(&format!("{}{}", BALANCE_KEY, account), &JsValue::from_f64(balance));
}

fn _burn_from(account: &str, value: f64) {
  let sender = get_sender();
  let allow = allowance(account, &sender);
  _burn(account, value);
  _approve(account, &sender, allow - value);
}
