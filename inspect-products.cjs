const XLSX = require('xlsx');
const path = require('path');

console.log('\n========== LISTE PRODUIT.xlsx ==========');
let filePath = path.join(__dirname, 'LISTE PRODUIT.xlsx');
let workbook = XLSX.readFile(filePath);
let sheetName = workbook.SheetNames[0];
let worksheet = workbook.Sheets[sheetName];
let data = XLSX.utils.sheet_to_json(worksheet);

console.log('Sheet name:', sheetName);
console.log('Total rows:', data.length);
console.log('\n=== Column Headers ===');
if (data.length > 0) {
  const headers = Object.keys(data[0]);
  headers.forEach((header, i) => {
    console.log(`${i + 1}. ${header}`);
  });
  
  console.log('\n=== First 2 Rows (Sample Data) ===');
  data.slice(0, 2).forEach((row, idx) => {
    console.log(`\nRow ${idx + 1}:`);
    Object.entries(row).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  });
}

console.log('\n\n========== LISTE PRODUIT EN STOCK.xlsx ==========');
filePath = path.join(__dirname, 'LISTE PRODUIT EN STOCK.xlsx');
workbook = XLSX.readFile(filePath);
sheetName = workbook.SheetNames[0];
worksheet = workbook.Sheets[sheetName];
data = XLSX.utils.sheet_to_json(worksheet);

console.log('Sheet name:', sheetName);
console.log('Total rows:', data.length);
console.log('\n=== Column Headers ===');
if (data.length > 0) {
  const headers = Object.keys(data[0]);
  headers.forEach((header, i) => {
    console.log(`${i + 1}. ${header}`);
  });
  
  console.log('\n=== First 2 Rows (Sample Data) ===');
  data.slice(0, 2).forEach((row, idx) => {
    console.log(`\nRow ${idx + 1}:`);
    Object.entries(row).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  });
}
