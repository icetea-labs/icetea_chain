// TODO: move this to tweb3 util

export const decimal = 6

export function toTEA (unit) {
  return unit / (10 ** decimal)
}

export function toUNIT (tea) {
  tea = tea.toFixed(decimal)
  return tea * (10 ** decimal)
}
