extern crate js_sys;
extern crate console_error_panic_hook;
extern crate wasm_bindgen;
extern crate icetea_wasm;
use wasm_bindgen::prelude::*;
use icetea_wasm::*;
use icetea_wasm::safe_math::*;

// Import blockchain info
#[wasm_bindgen]
extern {
  fn log(text: &str);
  fn get_sender() -> String;
  fn load(key: &str) -> Value;
  fn save(key: &str, value: &Value);
  fn json_stringify(value: &Value) -> String;
}

const BALANCE_KEY: &str = "bk";
const TOTAL_SUPPLY_KEY: &str = "tsk";
const ALLOW_KEY: &str = "ak";

// Smart contract entry point
#[wasm_bindgen]
pub fn main(operation: &str, value: &Value) -> Value {
  console_error_panic_hook::set_once();
  log(&format!("[RUST] Hello {}, you call method {}", get_sender(), operation));
  let params = value.as_array();

  match operation {
    "__on_deployed" => {
      let sender = get_sender();
      _mint(&sender, 1000000000);
    },
    "balance_of" => {
      let owner = params[0].as_string().unwrap();
      return Value::from_u32(balance_of(&owner));
    },
    "total_supply" => {
      return Value::from_u32(total_supply());
    },
    "allowance" => {
      let owner = params[0].as_string().unwrap();
      let spender = params[1].as_string().unwrap();
      return Value::from_u32(allowance(&owner, &spender));
    }
    "transfer" => {
      let to = params[0].as_string().unwrap();
      let value = params[1].as_u32().unwrap();
      return Value::from_bool(transfer(&to, value));
    },
    "approve" => {
      let spender = params[0].as_string().unwrap();
      let value = params[1].as_u32().unwrap();
      return Value::from_bool(approve(&spender, value));
    },
    "transfer_from" => {
      let from = params[0].as_string().unwrap();
      let to = params[1].as_string().unwrap();
      let value = params[2].as_u32().unwrap();
      return Value::from_bool(transfer_from(&from, &to, value));
    },
    "increase_allowance" => {
      let spender = params[0].as_string().unwrap();
      let value = params[1].as_u32().unwrap();
      return Value::from_bool(increase_allowance(&spender, value));
    },
    "decrease_allowance" => {
      let spender = params[0].as_string().unwrap();
      let value = params[1].as_u32().unwrap();
      return Value::from_bool(decrease_allowance(&spender, value));
    },
    &_ => log(&format!("[RUST] Method not found"))
  }

  return Value::from_bool(true);
}

#[wasm_bindgen]
pub fn total_supply() -> u32 {
  let total_supply = load!(u32, TOTAL_SUPPLY_KEY);
  return total_supply;
}

#[wasm_bindgen]
pub fn balance_of(owner: &str) -> u32 {
  let balance = load!(u32, &get_key!(BALANCE_KEY, owner));
  return balance;
}

#[wasm_bindgen]
pub fn allowance(owner: &str, spender: &str) -> u32 {
  let allow = load!(u32, &get_key!(ALLOW_KEY, owner, spender));
  return allow;
}

#[wasm_bindgen]
pub fn transfer(to: &str, value: u32) -> bool {
  let sender = get_sender();
  _transfer(&sender, to, value);
  return true;
}

#[wasm_bindgen]
pub fn approve(spender: &str, value: u32) -> bool {
  let sender = get_sender();
  _approve(&sender, spender, value);
  return true;
}

#[wasm_bindgen]
pub fn transfer_from(from: &str, to: &str, value: u32) -> bool {
  let sender = get_sender();
  let allow = allowance(from, &sender);
  _transfer(from, to, value);
  _approve(from, &sender, allow.sub(value));
  return true;
}

#[wasm_bindgen]
pub fn increase_allowance(spender: &str, add_value: u32) -> bool {
  let sender = get_sender();
  let allow = allowance(&sender, spender);
  _approve(&sender, spender, allow.add(add_value));
  return true;
}

#[wasm_bindgen]
pub fn decrease_allowance(spender: &str, subtracted_value: u32) -> bool {
  let sender = get_sender();
  let allow = allowance(&sender, spender);
  _approve(&sender, spender, allow.sub(subtracted_value));
  return true;
}

fn _transfer(from: &str, to: &str, value: u32) {
  require!(to != "", "invalid to address!");

  let mut from_balance = load!(u32, &get_key!(BALANCE_KEY, from));
  from_balance = from_balance.sub(value);
  save!(u32, &get_key!(BALANCE_KEY, from), from_balance);

  let mut to_balance = load!(u32, &get_key!(BALANCE_KEY, to));
  to_balance = to_balance.add(value);
  save!(u32, &get_key!(BALANCE_KEY, to), to_balance);
}

fn _approve(owner: &str, spender: &str, value: u32) {
  require!(owner != "" && spender != "", "invalid address!");
  save!(u32, &get_key!(ALLOW_KEY, owner, spender), value);
}

fn _mint(account: &str, value: u32) {
  require!(account != "", "invalid address!");

  let mut total_supply = load!(u32, TOTAL_SUPPLY_KEY);
  let mut balance = load!(u32, &get_key!(BALANCE_KEY, account));
  total_supply = total_supply.add(value);
  balance = balance.add(value);
  save!(u32, TOTAL_SUPPLY_KEY, total_supply);
  save!(u32, &get_key!(BALANCE_KEY, account), balance);
}

fn _burn(account: &str, value: u32) {
  require!(account != "", "invalid address!");

  let mut total_supply = load!(u32, TOTAL_SUPPLY_KEY);
  let mut balance = load!(u32, &get_key!(BALANCE_KEY, account));
  total_supply = total_supply.sub(value);
  balance = balance.sub(value);

  save!(u32, TOTAL_SUPPLY_KEY, total_supply);
  save!(u32, &get_key!(BALANCE_KEY, account), balance);
}

fn _burn_from(account: &str, value: u32) {
  let sender = get_sender();
  let allow = allowance(account, &sender);
  _burn(account, value);
  _approve(account, &sender, allow.sub(value));
}
