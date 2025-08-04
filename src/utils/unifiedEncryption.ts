import type { Account, Seed } from '@solana-mobile/seed-vault-lib';
import { SeedVault } from '@solana-mobile/seed-vault-lib';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { VaultKeyManager } from './vaultKey';

export interface UnifiedEncryptedContent {
  encryptedData: string;
  platform: 'android' | 'ios';
  keyId?: string; // For iOS vault key
  seedName?: string; // For Android seed vault
  derivationPath?: string; // For Android seed vault
  createdAt: string;
  walletAddress: string;
  version: '2.0'; // New version to distinguish from old encryption
}

/**
 * Unified Encryption Service for CapsuleX
 * - Uses Solana Mobile Seed Vault on Android
 * - Uses VaultKeyManager on iOS
 * - Provides consistent interface across platforms
 */
export class UnifiedEncryption {
  private static readonly ENCRYPTION_MESSAGE_PREFIX = 'CapsuleX-Encrypt-v2:';
  private static readonly DEFAULT_DERIVATION_PATH = "m/44'/0'/0'/0'"; // BIP39 compatible derivation
  
  // Cache for working derivation paths per seed
  private static seedDerivationPaths = new Map<number, string>();

  /**
   * Initialize encryption for the current platform
   * Android: Ensures seed is authorized
   * iOS: Ensures vault key exists
   */
  static async initialize(_walletAddress: string): Promise<void> {
    if (Platform.OS === 'android') {
      await this.initializeAndroidSeedVault();
    } else {
      // For iOS, vault key is created on-demand
      console.log(
        '📱 iOS encryption ready (vault key will be created on first use)'
      );
    }
  }

  /**
   * Check if encryption is available for the current platform
   */
  static async isAvailable(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        // First check if SeedVault is available at all
        if (!SeedVault || typeof SeedVault.getAuthorizedSeeds !== 'function') {
          console.log('🤖 SeedVault module not available');
          return false;
        }

        // Check if we have any authorized seeds
        const authorizedSeeds = await SeedVault.getAuthorizedSeeds();
        return authorizedSeeds.length > 0;
      } catch (error) {
        console.log('🤖 Android Seed Vault not available:', error);
        return false;
      }
    } else {
      // iOS always available (uses SecureStore)
      return true;
    }
  }

  /**
   * Encrypt content using the appropriate method for the platform
   */
  static async encryptContent(
    content: string,
    walletAddress: string
  ): Promise<UnifiedEncryptedContent> {
    const createdAt = new Date().toISOString();

    if (Platform.OS === 'android') {
      try {
        return await this.encryptWithSeedVault(content, walletAddress, createdAt);
      } catch (error) {
        // Discrete fallback to VaultKey method
        return await this.encryptWithVaultKey(content, walletAddress, createdAt);
      }
    } else {
      return await this.encryptWithVaultKey(content, walletAddress, createdAt);
    }
  }

  /**
   * Decrypt content using the appropriate method for the platform
   */
  static async decryptContent(
    encryptedContent: UnifiedEncryptedContent
  ): Promise<string> {
    // Verify version compatibility
    if (encryptedContent.version !== '2.0') {
      throw new Error(
        'Unsupported encryption version. Content encrypted with older version.'
      );
    }

    if (encryptedContent.platform === 'android') {
      try {
        return await this.decryptWithSeedVault(encryptedContent);
      } catch (error) {
        // Discrete fallback - if content has keyId, it was encrypted with VaultKey
        if (encryptedContent.keyId) {
          return await this.decryptWithVaultKey(encryptedContent);
        }
        throw error;
      }
    } else {
      return await this.decryptWithVaultKey(encryptedContent);
    }
  }

  /**
   * Find working derivation path for a seed
   */
  private static async findWorkingDerivationPath(seed: Seed): Promise<string> {
    // Check cache first
    if (this.seedDerivationPaths.has(seed.authToken)) {
      return this.seedDerivationPaths.get(seed.authToken)!;
    }

    const derivationPaths = [
      // BIP39 compatible paths (most likely for Seed Vault Simulator)
      "m/44'/0'/0'/0'",
      "m/44'/0'/0'",
      "m/44'/0'",
      "m/0'/0'",
      "m/0",
      // Standard Solana paths
      "m/44'/501'/0'/0'",
      "m/44'/501'/0'",
      "m/44'/501'",
    ];

    const testMessage = Buffer.from('derivation-test').toString('base64');
    
    for (const derivationPath of derivationPaths) {
      try {
        console.log(`🔍 Testing derivation path: ${derivationPath} for seed ${seed.name}`);
        await SeedVault.signMessage(seed.authToken, derivationPath, testMessage);
        
        // Success! Cache and return this path
        console.log(`✅ Found working derivation path: ${derivationPath} for seed ${seed.name}`);
        this.seedDerivationPaths.set(seed.authToken, derivationPath);
        return derivationPath;
        
      } catch (error) {
        console.log(`❌ Derivation path ${derivationPath} failed for seed ${seed.name}`);
        continue;
      }
    }
    
    throw new Error(`No working derivation path found for seed ${seed.name}. Please approve the signing dialogs when they appear.`);
  }

  /**
   * Android: Initialize Seed Vault and ensure we have authorized seeds
   */
  private static async initializeAndroidSeedVault(): Promise<void> {
    try {
      // First check if SeedVault is available
      if (!SeedVault || typeof SeedVault.getAuthorizedSeeds !== 'function') {
        throw new Error('SeedVault module not available on this device');
      }

      // Check if we have unauthorized seeds that need authorization
      const hasUnauthorizedSeeds = await SeedVault.hasUnauthorizedSeeds();

      if (hasUnauthorizedSeeds) {
        console.log('🤖 Found unauthorized seeds, requesting authorization...');
        const result = await SeedVault.authorizeNewSeed();
        console.log(
          '✅ Seed authorized with token:',
          String(result.authToken).slice(0, 8) + '...'
        );
      }

      // Verify we have at least one authorized seed
      const authorizedSeeds = await SeedVault.getAuthorizedSeeds();
      if (authorizedSeeds.length === 0) {
        throw new Error('No authorized seeds available for encryption');
      }

      console.log(
        `🤖 Android Seed Vault ready with ${authorizedSeeds.length} authorized seed(s)`
      );
    } catch (error) {
      console.error('❌ Failed to initialize Android Seed Vault:', error);
      throw new Error('Seed Vault initialization failed');
    }
  }

  /**
   * Android: Encrypt using Solana Mobile Seed Vault
   */
  private static async encryptWithSeedVault(
    content: string,
    walletAddress: string,
    createdAt: string
  ): Promise<UnifiedEncryptedContent> {
    try {
      return await this.attemptSeedVaultEncryption(
        content,
        walletAddress,
        createdAt
      );
    } catch (error) {
      console.error('❌ First encryption attempt failed:', error);

      // Check if this is an authorization error (result=1007)
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('1007') ||
        errorMessage.includes('authorization') ||
        errorMessage.includes('ActionFailedException')
      ) {
        console.log(
          '🔄 Authorization error detected (result=1007 - user denied or expired), attempting to re-authorize seed...'
        );

        try {
          // When authorization expires, we might need to initialize again first
          console.log('🔄 Re-initializing Seed Vault...');
          await this.initializeAndroidSeedVault();
          
          // If initialization succeeds, try direct re-authorization
          await this.reauthorizeSeed();

          // Retry encryption with fresh authorization
          console.log('🔄 Retrying encryption with fresh authorization...');
          return await this.attemptSeedVaultEncryption(
            content,
            walletAddress,
            createdAt
          );
        } catch (reAuthError) {
          console.error('❌ Re-authorization failed:', reAuthError);
          const reAuthErrorMessage = reAuthError instanceof Error ? reAuthError.message : String(reAuthError);
          
          if (reAuthErrorMessage.includes('NEED_NEW_SEED')) {
            throw new Error(
              'Seed Vault authorization expired. Please open the Seed Vault Simulator app, create a new seed or ensure existing seeds are available, then try again.'
            );
          } else {
            throw new Error(
              'Seed Vault authorization expired and re-authorization failed. Please go to Profile settings and set up Seed Vault again.'
            );
          }
        }
      }

      // Re-throw other errors
      throw new Error('Failed to encrypt content with Seed Vault');
    }
  }

  /**
   * Attempt to re-authorize seed when authorization expires
   */
  private static async reauthorizeSeed(): Promise<void> {
    try {
      console.log('🔄 Attempting to re-authorize Seed Vault...');

      // First, deauthorize existing seeds to make them available for re-authorization
      try {
        const authorizedSeeds = await SeedVault.getAuthorizedSeeds();
        console.log(
          `🔄 Found ${authorizedSeeds.length} authorized seeds, deauthorizing them...`
        );

        // Deauthorize all existing seeds to make them available again
        for (const seed of authorizedSeeds) {
          console.log(`🔄 Deauthorizing seed: ${seed.name} (${seed.authToken})`);
          await SeedVault.deauthorizeSeed(seed.authToken);
        }
        
        console.log('✅ All seeds deauthorized, they should now be available for re-authorization');
      } catch (error) {
        console.warn('⚠️ Could not deauthorize existing seeds:', error);
      }

      // Check if there are unauthorized seeds available now
      const hasUnauthorized = await SeedVault.hasUnauthorizedSeeds();
      console.log('🔄 Has unauthorized seeds after deauthorization:', hasUnauthorized);

      if (hasUnauthorized) {
        console.log('🔄 Found unauthorized seeds, re-authorizing...');
        const result = await SeedVault.authorizeNewSeed();
        console.log(
          '✅ Seed re-authorized successfully:',
          String(result.authToken).slice(0, 8) + '...'
        );
      } else {
        // If still no unauthorized seeds, suggest creating a new seed
        throw new Error(
          'NEED_NEW_SEED: No unauthorized seeds available even after deauthorization. Please create a new seed in the Seed Vault Simulator app, then try again.'
        );
      }
    } catch (error) {
      console.error('❌ Re-authorization failed:', error);
      throw error;
    }
  }

  /**
   * Perform the actual encryption attempt
   */
  private static async attemptSeedVaultEncryption(
    content: string,
    walletAddress: string,
    createdAt: string
  ): Promise<UnifiedEncryptedContent> {
    // Get the first authorized seed
    const authorizedSeeds = await SeedVault.getAuthorizedSeeds();
    if (authorizedSeeds.length === 0) {
      throw new Error('No authorized seeds available');
    }

    const seed = authorizedSeeds[0];
    
    console.log(
      `🤖 Using seed: ${seed.name} (token: ${String(seed.authToken).slice(0, 8)}...)`
    );
    console.log(`🤖 Seed details:`, {
      name: seed.name,
      authToken: seed.authToken,
      purpose: seed.purpose
    });

    console.log('Authorized seed = ' + seed.name + ', ' + seed.authToken);
    const accounts = await SeedVault.getUserWallets(seed.authToken);
    console.log('📋 Found accounts:', accounts);
    
    let derivationPath: string;
    
    if (!accounts || accounts.length === 0) {
      console.log('🔧 No user wallet accounts found, requesting public key to create one...');
      
      // Request a public key to create an account
      try {
        const publicKeyResult = await SeedVault.getPublicKey(
          seed.authToken, 
          this.DEFAULT_DERIVATION_PATH
        );
        console.log('✅ Created account with public key:', publicKeyResult.publicKeyEncoded.slice(0, 8) + '...');
        console.log('✅ Using derivation path:', publicKeyResult.resolvedDerivationPath);
        
        derivationPath = publicKeyResult.resolvedDerivationPath;
      } catch (createError) {
        console.error('❌ Failed to create account:', createError);
        throw new Error(`Failed to create user wallet account: ${createError instanceof Error ? createError.message : String(createError)}`);
      }
    } else {
      const account = accounts[0];
      console.log('🔑 Using existing account:', {
        name: account.name,
        publicKey: account.publicKeyEncoded.slice(0, 8) + '...',
        derivationPath: account.derivationPath
      });
      
      derivationPath = account.derivationPath;
    }

    // Create a unique message to sign for this content
    const nonce = await Crypto.getRandomBytesAsync(16);
    const nonceHex = Array.from(nonce)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const messageToSign = `${this.ENCRYPTION_MESSAGE_PREFIX}${nonceHex}:${createdAt}`;
    const messageBytes = new TextEncoder().encode(messageToSign);

    console.log(
      `🤖 Signing message for encryption: ${messageToSign.slice(0, 50)}...`
    );
    console.log(`🤖 Message length: ${messageBytes.length} bytes`);
    console.log(`🤖 Full message: ${messageToSign}`);

    // Sign the message to get deterministic encryption key
    // Convert message bytes to base64 string as expected by SeedVault API
    const messageBase64 = Buffer.from(messageBytes).toString('base64');
    console.log(`🤖 Base64 message: ${messageBase64}`);
    
    // First try a simple test message
    try {
      console.log('🧪 Testing with a simple message first...');
      const testMessage = 'hello world';
      const testMessageBase64 = Buffer.from(testMessage).toString('base64');
      console.log(`🧪 Test message base64: ${testMessageBase64}`);
      console.log(`🧪 Using authToken: ${seed.authToken}`);
      console.log(`🧪 Using derivationPath: ${derivationPath}`);
      console.log(`🧪 About to call SeedVault.signMessage - WATCH FOR DIALOG NOW!`);
      
      const testSignResult = await SeedVault.signMessage(
        seed.authToken,
        derivationPath,
        testMessageBase64
      );
      console.log('✅ Simple test message signed successfully!');
      console.log('✅ Test signature result:', testSignResult);
      
      // If test succeeds, try the actual message
      console.log('🤖 Now trying the actual encryption message...');
    } catch (testError) {
      console.error('❌ Even simple test message failed:', testError);
      throw new Error('🚨 USER ACTION REQUIRED: SeedVault is trying to show a signing dialog but getting result=1007 (CANCELED). Please watch your device screen for a Seed Vault popup dialog and click APPROVE/OK when it appears. If no dialog shows up, make sure the Seed Vault Simulator app is running.');
    }
    
    const signResult = await SeedVault.signMessage(
      seed.authToken,
      derivationPath,
      messageBase64
    );

    // Use the signature as encryption key (take first 32 bytes)
    // The signature is returned as Base64, convert to bytes
    const signatureBytes = Buffer.from(signResult.signatures[0], 'base64');
    const encryptionKey = signatureBytes.slice(0, 32);

    // Encrypt content using XOR
    const encryptedData = this.xorEncrypt(content, encryptionKey);

    console.log('🤖🔐 Content encrypted with Seed Vault');

    return {
      encryptedData: encryptedData + ':' + nonceHex, // Append nonce for decryption
      platform: 'android',
      seedName: seed.name,
      derivationPath,
      createdAt,
      walletAddress,
      version: '2.0',
    };
  }

  /**
   * Android: Decrypt using Solana Mobile Seed Vault
   */
  private static async decryptWithSeedVault(
    encryptedContent: UnifiedEncryptedContent
  ): Promise<string> {
    try {
      // Get the authorized seed (by name if available)
      const authorizedSeeds = await SeedVault.getAuthorizedSeeds();
      let seed: Seed | undefined;

      if (encryptedContent.seedName) {
        seed = authorizedSeeds.find(s => s.name === encryptedContent.seedName);
      }

      if (!seed && authorizedSeeds.length > 0) {
        // Fallback to first available seed
        seed = authorizedSeeds[0];
      }

      if (!seed) {
        throw new Error('No authorized seed available for decryption');
      }

      // Split encrypted data and nonce
      const [encryptedHex, nonceHex] =
        encryptedContent.encryptedData.split(':');
      if (!encryptedHex || !nonceHex) {
        throw new Error('Invalid encrypted data format');
      }

      // Recreate the signing message
      const messageToSign = `${this.ENCRYPTION_MESSAGE_PREFIX}${nonceHex}:${encryptedContent.createdAt}`;
      const messageBytes = new TextEncoder().encode(messageToSign);

      // Sign the message to get the same encryption key
      // Convert message bytes to base64 string as expected by SeedVault API
      const messageBase64 = Buffer.from(messageBytes).toString('base64');
      const signResult = await SeedVault.signMessage(
        seed.authToken,
        encryptedContent.derivationPath || this.DEFAULT_DERIVATION_PATH,
        messageBase64
      );

      // Use the signature as decryption key
      // The signature is returned as Base64, convert to bytes
      const signatureBytes = Buffer.from(signResult.signatures[0], 'base64');
      const decryptionKey = signatureBytes.slice(0, 32);

      // Decrypt content using XOR
      const decryptedContent = this.xorDecrypt(encryptedHex, decryptionKey);

      console.log('🤖🔓 Content decrypted with Seed Vault');
      return decryptedContent;
    } catch (error) {
      console.error('❌ Seed Vault decryption failed:', error);
      throw new Error('Failed to decrypt content with Seed Vault');
    }
  }

  /**
   * iOS: Encrypt using VaultKeyManager
   */
  private static async encryptWithVaultKey(
    content: string,
    walletAddress: string,
    createdAt: string
  ): Promise<UnifiedEncryptedContent> {
    try {
      const vaultEncrypted = await VaultKeyManager.encryptContent(
        content,
        walletAddress
      );

      console.log('📱🔐 Content encrypted with Vault Key');

      return {
        encryptedData: vaultEncrypted.encryptedData,
        platform: 'ios',
        keyId: vaultEncrypted.keyId,
        createdAt,
        walletAddress,
        version: '2.0',
      };
    } catch (error) {
      console.error('❌ Vault Key encryption failed:', error);
      throw new Error('Failed to encrypt content with Vault Key');
    }
  }

  /**
   * iOS: Decrypt using VaultKeyManager
   */
  private static async decryptWithVaultKey(
    encryptedContent: UnifiedEncryptedContent
  ): Promise<string> {
    try {
      // Convert to VaultKeyManager format
      const vaultContent = {
        encryptedData: encryptedContent.encryptedData,
        keyId: encryptedContent.keyId!,
        createdAt: encryptedContent.createdAt,
        walletAddress: encryptedContent.walletAddress,
      };

      const decryptedContent =
        await VaultKeyManager.decryptContent(vaultContent);

      console.log('📱🔓 Content decrypted with Vault Key');
      return decryptedContent;
    } catch (error) {
      console.error('❌ Vault Key decryption failed:', error);
      throw new Error('Failed to decrypt content with Vault Key');
    }
  }

  /**
   * XOR encryption utility
   */
  private static xorEncrypt(data: string, key: Uint8Array): string {
    const dataBytes = new TextEncoder().encode(data);
    const encrypted = new Uint8Array(dataBytes.length);

    for (let i = 0; i < dataBytes.length; i++) {
      encrypted[i] = dataBytes[i] ^ key[i % key.length];
    }

    return Array.from(encrypted)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * XOR decryption utility
   */
  private static xorDecrypt(encryptedHex: string, key: Uint8Array): string {
    const encryptedBytes = new Uint8Array(
      encryptedHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
    );

    const decrypted = new Uint8Array(encryptedBytes.length);
    for (let i = 0; i < encryptedBytes.length; i++) {
      decrypted[i] = encryptedBytes[i] ^ key[i % key.length];
    }

    return new TextDecoder().decode(decrypted);
  }

  /**
   * Force refresh authorization - use this when user wants to manually re-authorize
   */
  static async refreshAuthorization(): Promise<void> {
    if (Platform.OS === 'android') {
      await this.reauthorizeSeed();
    } else {
      // iOS doesn't need special authorization refresh
      console.log('📱 iOS doesn\'t require authorization refresh');
    }
  }

  /**
   * Diagnostic function to test SeedVault basic functionality
   */
  static async testSeedVault(): Promise<void> {
    if (Platform.OS !== 'android') {
      console.log('📱 SeedVault test only works on Android');
      return;
    }

    try {
      console.log('🧪 === SEED VAULT DIAGNOSTIC TEST ===');
      
      // Test 1: Check if module is available
      console.log('🧪 Test 1: Module availability');
      if (!SeedVault) {
        throw new Error('SeedVault module not available');
      }
      console.log('✅ SeedVault module is available');

      // Test 2: Get authorized seeds
      console.log('🧪 Test 2: Get authorized seeds');
      const authorizedSeeds = await SeedVault.getAuthorizedSeeds();
      console.log(`✅ Found ${authorizedSeeds.length} authorized seeds:`, authorizedSeeds);

      if (authorizedSeeds.length === 0) {
        throw new Error('No authorized seeds available');
      }

      // Test 3: Try different seeds and derivation paths
      for (let i = 0; i < Math.min(authorizedSeeds.length, 2); i++) {
        const seed = authorizedSeeds[i];
        console.log(`🧪 Test 3.${i+1}: Testing seed ${seed.name} (${seed.authToken})`);
        
        // Try different derivation paths for both BIP39 and Ed25519
        const derivationPaths = [
          // Standard Solana paths
          "m/44'/501'/0'/0'",
          "m/44'/501'/0'",
          "m/44'/501'",
          // BIP39 compatible paths
          "m/44'/0'/0'/0'",
          "m/44'/0'/0'",
          "m/44'/0'",
          // Simple paths
          "m/0'/0'",
          "m/0",
        ];
        
        for (const derivationPath of derivationPaths) {
          try {
            console.log(`🧪 Trying derivation path: ${derivationPath}`);
            const simpleMessage = Buffer.from('test').toString('base64');
            
            console.log('🧪 🚨 APPROVE THE DIALOG WHEN IT APPEARS! 🚨');
            
            const result = await SeedVault.signMessage(
              seed.authToken,
              derivationPath,
              simpleMessage
            );
            
            console.log(`✅ SUCCESS! Seed ${seed.name} with path ${derivationPath} works:`, result);
            return; // Success, exit early
            
          } catch (error) {
            console.log(`❌ Failed with seed ${seed.name}, path ${derivationPath}:`, error);
          }
        }
      }
      
      throw new Error('All seed and derivation path combinations failed');
      
    } catch (error) {
      console.error('❌ SeedVault diagnostic failed:', error);
      console.log('🚨 TROUBLESHOOTING STEPS:');
      console.log('1. Open Seed Vault Simulator app');
      console.log('2. Delete all existing seeds');
      console.log('3. Create a new seed');
      console.log('4. Make sure to approve all permission dialogs');
      console.log('5. Try again');
      throw error;
    }
  }

  /**
   * Get encryption status and info for debugging
   */
  static async getEncryptionInfo(walletAddress: string): Promise<{
    platform: 'android' | 'ios';
    available: boolean;
    details: any;
  }> {
    const available = await this.isAvailable();
    let details: any = {};

    if (Platform.OS === 'android') {
      try {
        // First check if SeedVault is available
        if (!SeedVault || typeof SeedVault.getAuthorizedSeeds !== 'function') {
          details = {
            error: 'SeedVault module not available on this device',
            available: false,
          };
        } else {
          const authorizedSeeds = await SeedVault.getAuthorizedSeeds();
          const hasUnauthorized = await SeedVault.hasUnauthorizedSeeds();
          details = {
            authorizedSeeds: authorizedSeeds.length,
            hasUnauthorizedSeeds: hasUnauthorized,
            seedNames: authorizedSeeds.map(s => s.name),
          };
        }
      } catch (error) {
        details = {
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    } else {
      const hasVaultKey = await VaultKeyManager.hasVaultKey(walletAddress);
      const keyInfo = await VaultKeyManager.getVaultKeyInfo(walletAddress);
      details = {
        hasVaultKey,
        keyInfo,
      };
    }

    return {
      platform: Platform.OS as 'android' | 'ios',
      available,
      details,
    };
  }
}

/**
 * React hook for unified encryption
 */
export function useUnifiedEncryption() {
  return {
    initialize: UnifiedEncryption.initialize,
    isAvailable: UnifiedEncryption.isAvailable,
    encryptContent: UnifiedEncryption.encryptContent,
    decryptContent: UnifiedEncryption.decryptContent,
    getEncryptionInfo: UnifiedEncryption.getEncryptionInfo,
    refreshAuthorization: UnifiedEncryption.refreshAuthorization,
    testSeedVault: UnifiedEncryption.testSeedVault,
  };
}
