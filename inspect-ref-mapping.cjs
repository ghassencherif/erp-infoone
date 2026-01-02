const XLSX = require('xlsx');

const workbook = XLSX.readFile('REF FAC + REF SITE.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('📊 Excel File Structure:');
console.log('Total rows:', data.length);
console.log('\nColumn names:', Object.keys(data[0] || {}));
console.log('\nFirst 5 rows:');
data.slice(0, 5).forEach((row, idx) => {
  console.log(`\nRow ${idx + 1}:`, JSON.stringify(row, null, 2));
});
