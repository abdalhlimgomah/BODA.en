const fs = require('fs');
const path = 'C:\\Users\\BODa\\Documents\\Date bsnas Home BODA\\موقع الخاص بك\\assets\\js\\wishlist.js';
let content = fs.readFileSync(path, 'utf8');

const newFunc = `function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&')
    .replaceAll('<', '<')
    .replaceAll('>', '>')
    .replaceAll('"', '"')
    .replaceAll("'", '&#039;');
}`;

content = content.replace(
  /function escapeHtml\(value\) \{[\s\S]*?return String\(value \?\? ""\)[\s\S]*?replaceAll\('\'', "&#039;"\);\s*\}/,
  newFunc
);

fs.writeFileSync(path, content);
console.log('Fixed');