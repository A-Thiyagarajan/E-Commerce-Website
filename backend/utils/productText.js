export function cleanProductName(value) {
  return String(value ?? '')
    .replace(/[\s\u00a0]*₹[\s\u00a0]*$/u, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function cleanProductDescription(value) {
  return String(value ?? '')
    .replace(/[\t \u00a0]*₹(?=\s|$)[\t \u00a0]*/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}
