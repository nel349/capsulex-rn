#!/usr/bin/env node

/**
 * Script to update development IP address in API config
 * Usage: node scripts/update-dev-ip.js [IP_ADDRESS]
 * If no IP is provided, it will attempt to auto-detect
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG_PATH = path.join(__dirname, '../src/config/api.ts');

function getLocalIP() {
  try {
    // Try to get IP from ifconfig (macOS/Linux)
    const result = execSync('ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1', { encoding: 'utf8' });
    const match = result.match(/inet (\d+\.\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  } catch (error) {
    console.warn('⚠️  Could not auto-detect IP address');
    return null;
  }
}

function updateConfigFile(newIP) {
  try {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    
    // Replace the DEV_HOST line
    const updatedContent = configContent.replace(
      /DEV_HOST: '[^']*'/,
      `DEV_HOST: '${newIP}'`
    );
    
    fs.writeFileSync(CONFIG_PATH, updatedContent, 'utf8');
    console.log('✅ Updated API config with new IP:', newIP);
    console.log('📁 File:', CONFIG_PATH);
  } catch (error) {
    console.error('❌ Failed to update config file:', error.message);
    process.exit(1);
  }
}

function main() {
  const providedIP = process.argv[2];
  let targetIP = providedIP;
  
  if (!targetIP) {
    console.log('🔍 Auto-detecting local IP address...');
    targetIP = getLocalIP();
  }
  
  if (!targetIP) {
    console.error('❌ Could not determine IP address');
    console.log('💡 Usage: node scripts/update-dev-ip.js 192.168.1.XXX');
    process.exit(1);
  }
  
  console.log('🎯 Target IP:', targetIP);
  updateConfigFile(targetIP);
  console.log('🔄 Restart your React Native app to apply changes');
}

main();