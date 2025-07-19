import 'fast-text-encoding';
import { Buffer } from 'buffer';
import 'react-native-get-random-values';

import { getRandomValues as expoCryptoGetRandomValues } from 'expo-crypto';

global.Buffer = Buffer;

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
