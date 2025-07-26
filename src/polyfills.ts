import 'fast-text-encoding';
import { Buffer } from 'buffer';
import 'react-native-get-random-values';

import { getRandomValues as expoCryptoGetRandomValues } from 'expo-crypto';

global.Buffer = Buffer;

// Fix Buffer.subarray to ensure it returns proper Buffer instances with all methods
Buffer.prototype.subarray = function subarray(
  begin: number | undefined,
  end: number | undefined
) {
  const result = Uint8Array.prototype.subarray.apply(this, [begin, end]);
  Object.setPrototypeOf(result, Buffer.prototype); // Explicitly add the `Buffer` prototype (adds `readUIntLE`!)
  return result;
};

// Debug buffer methods availability
console.log('🔧 Buffer polyfill check:', {
  readUIntLE: typeof Buffer.prototype.readUIntLE,
  readUIntBE: typeof Buffer.prototype.readUIntBE,
  writeUIntLE: typeof Buffer.prototype.writeUIntLE,
  writeUIntBE: typeof Buffer.prototype.writeUIntBE,
});


// getRandomValues polyfill
class Crypto {
  getRandomValues = expoCryptoGetRandomValues;
}

const webCrypto = typeof crypto !== 'undefined' ? crypto : new Crypto();

(() => {
  if (typeof crypto === 'undefined') {
    Object.defineProperty(window, 'crypto', {
      configurable: true,
      enumerable: true,
      get: () => webCrypto,
    });
  }
})();

// Additional polyfills for Privy embedded wallet
import '@ethersproject/shims';

// Polyfill for structuredClone
if (typeof structuredClone === 'undefined') {
  global.structuredClone = (obj: any) => {
    return JSON.parse(JSON.stringify(obj));
  };
}
