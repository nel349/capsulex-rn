// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add polyfill resolvers for Node.js modules that libraries like jose need
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  crypto: require.resolve('expo-crypto'),
  'node:crypto': require.resolve('expo-crypto'),
  util: require.resolve('util'),
  stream: require.resolve('stream-browserify'),
  zlib: require.resolve('browserify-zlib'),
  http: require.resolve('stream-http'),
  https: require.resolve('https-browserify'),
  url: require.resolve('url'),
  assert: require.resolve('assert'),
  events: require.resolve('events'),
  // Force @noble/hashes/crypto.js to use expo-crypto
  '@noble/hashes/crypto': require.resolve('expo-crypto'),
};

// Prioritize browser builds for better React Native compatibility
config.resolver.resolverMainFields = [
  'browser',
  'module',
  'main',
];

module.exports = config;
