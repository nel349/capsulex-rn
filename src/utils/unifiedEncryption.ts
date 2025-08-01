import type { Seed } from '@solana-mobile/seed-vault-lib';
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
  private static readonly DEFAULT_DERIVATION_PATH = "m/44'/501'/0'/0'"; // Standard Solana derivation

  /**
   * Initialize encryption for the current platform
   * Android: Ensures seed is authorized
   * iOS: Ensures vault key exists
   */
  static async initialize(walletAddress: string): Promise<void> {
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
      return await this.encryptWithSeedVault(content, walletAddress, createdAt);
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
      return await this.decryptWithSeedVault(encryptedContent);
    } else {
      return await this.decryptWithVaultKey(encryptedContent);
    }
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
      // Get the first authorized seed
      const authorizedSeeds = await SeedVault.getAuthorizedSeeds();
      if (authorizedSeeds.length === 0) {
        throw new Error('No authorized seeds available');
      }

      const seed = authorizedSeeds[0];
      const derivationPath = this.DEFAULT_DERIVATION_PATH;

      // Create a unique message to sign for this content
      const nonce = await Crypto.getRandomBytesAsync(16);
      const nonceHex = Array.from(nonce)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const messageToSign = `${this.ENCRYPTION_MESSAGE_PREFIX}${nonceHex}:${createdAt}`;
      const messageBytes = new TextEncoder().encode(messageToSign);

      // Sign the message to get deterministic encryption key
      const signResult = await SeedVault.signMessage(
        seed.authToken,
        derivationPath,
        Array.from(messageBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
      );

      // Use the signature as encryption key (take first 32 bytes)
      const signatureBytes = new Uint8Array(
        signResult.signatures[0].match(/.{2}/g)!.map(byte => parseInt(byte, 16))
      );
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
    } catch (error) {
      console.error('❌ Seed Vault encryption failed:', error);
      throw new Error('Failed to encrypt content with Seed Vault');
    }
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
      const signResult = await SeedVault.signMessage(
        seed.authToken,
        encryptedContent.derivationPath || this.DEFAULT_DERIVATION_PATH,
        Array.from(messageBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
      );

      // Use the signature as decryption key
      const signatureBytes = new Uint8Array(
        signResult.signatures[0].match(/.{2}/g)!.map(byte => parseInt(byte, 16))
      );
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
  };
}
