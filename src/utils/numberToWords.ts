const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function convertHundreds(num: number): string {
  let result = '';
  
  const hundred = Math.floor(num / 100);
  const remainder = num % 100;
  
  if (hundred > 0) {
    if (hundred === 1) {
      result = 'cent';
    } else {
      result = units[hundred] + ' cent';
    }
    if (remainder === 0 && hundred > 1) {
      result += 's';
    }
  }
  
  if (remainder > 0) {
    if (result) result += ' ';
    
    if (remainder < 10) {
      result += units[remainder];
    } else if (remainder < 20) {
      result += teens[remainder - 10];
    } else {
      const ten = Math.floor(remainder / 10);
      const unit = remainder % 10;
      
      if (ten === 7 || ten === 9) {
        if (remainder === 71 || remainder === 91) {
          result += tens[ten] + ' et ' + teens[unit];
        } else {
          result += tens[ten] + '-' + teens[unit];
        }
      } else {
        result += tens[ten];
        if (unit === 1 && ten !== 8) {
          result += ' et un';
        } else if (unit > 1) {
          result += '-' + units[unit];
        } else if (unit === 0 && ten === 8) {
          result += 's';
        }
      }
    }
  }
  
  return result;
}

function convertThousands(num: number): string {
  if (num === 0) return 'zéro';
  
  let result = '';
  
  const million = Math.floor(num / 1000000);
  const thousand = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;
  
  if (million > 0) {
    if (million === 1) {
      result = 'un million';
    } else {
      result = convertHundreds(million) + ' millions';
    }
  }
  
  if (thousand > 0) {
    if (result) result += ' ';
    if (thousand === 1) {
      result += 'mille';
    } else {
      result += convertHundreds(thousand) + ' mille';
    }
  }
  
  if (remainder > 0) {
    if (result) result += ' ';
    result += convertHundreds(remainder);
  }
  
  return result;
}

export function numberToWordsFr(amount: number): string {
  if (amount === 0) return 'Zéro dinar';
  
  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 1000);
  
  let result = convertThousands(integerPart);
  result = result.charAt(0).toUpperCase() + result.slice(1);
  
  if (integerPart === 1) {
    result += ' dinar';
  } else {
    result += ' dinars';
  }
  
  if (decimalPart > 0) {
    result += ' et ' + convertThousands(decimalPart) + ' millime';
    if (decimalPart > 1) {
      result += 's';
    }
  }
  
  return result;
}
