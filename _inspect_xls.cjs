const XLSX = require('xlsx');
const wb = XLSX.readFile('Test sched/Test sched.xls');
console.log('Sheet names:', JSON.stringify(wb.SheetNames));
wb.SheetNames.forEach(name => {
  const ws = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, {header: 1, defval: ''});
  console.log('\n=== Sheet:', name, '=== rows:', data.length);
  data.slice(0, 30).forEach((row, idx) => {
    const c = row.map((v, i) => {
      if (i === 2) return 'C:' + v;
      if (i === 3) return 'D:' + v;
      if (i === 5) return 'F:' + v;
      return v;
    }).join(' | ');
    console.log('Row ' + idx + ': ' + c);
  });
});