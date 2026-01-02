const XLSX = require('xlsx');
const path = require('path');

// Read the Excel file
const filePath = path.join(__dirname, 'LISTE CLIENT.xlsx');
const workbook = XLSX.readFile(filePath);

// Get the first sheet
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Sheet name:', sheetName);
console.log('Total rows:', data.length);
console.log('\n=== Column Headers ===');
if (data.length > 0) {
  const headers = Object.keys(data[0]);
  headers.forEach((header, i) => {
    console.log(`${i + 1}. ${header}`);
  });
  
  console.log('\n=== First 3 Rows (Sample Data) ===');
  data.slice(0, 3).forEach((row, idx) => {
    console.log(`\nRow ${idx + 1}:`);
    Object.entries(row).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  });
}
