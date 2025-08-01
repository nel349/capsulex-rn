import * as Crypto from 'expo-crypto';

import type { Capsule, CreateCapsuleRequest } from '../types/api';
import type { UnifiedEncryptedContent } from '../utils/unifiedEncryption';
import { UnifiedEncryption } from '../utils/unifiedEncryption';

/**
 * Service to handle capsule encryption using the unified encryption system
 * Provides backwards compatibility with old encryption formats
 */
export class CapsuleEncryptionService {
  /**
   * Initialize encryption for the given wallet address
   */
  static async initialize(walletAddress: string): Promise<void> {
    try {
      await UnifiedEncryption.initialize(walletAddress);
      console.log(
        '✅ Capsule encryption initialized for wallet:',
        walletAddress.slice(0, 8) + '...'
      );
    } catch (error) {
      console.error('❌ Failed to initialize capsule encryption:', error);
      throw new Error('Failed to initialize encryption system');
    }
  }

  /**
   * Check if encryption is available and ready
   */
  static async isEncryptionAvailable(): Promise<boolean> {
    return await UnifiedEncryption.isAvailable();
  }

  /**
   * Encrypt only the content string and return encryption result with metadata
   */
  static async encryptContent(
    content: string,
    walletAddress: string
  ): Promise<{
    content_encrypted: string;
    content_hash: string;
    encryption_version: string;
    encryption_platform: 'android' | 'ios';
    encryption_key_id?: string;
    encryption_seed_name?: string;
    encryption_derivation_path?: string;
  }> {
    try {
      // Encrypt only the content - nothing else!
      const encryptedContent = await UnifiedEncryption.encryptContent(
        content,
        walletAddress
      );

      // Create content hash for integrity verification
      const contentHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        content
      );

      console.log('🔐 Content encrypted (content only)');
      return {
        content_encrypted: encryptedContent.encryptedData,
        content_hash: contentHash,
        encryption_version: encryptedContent.version,
        encryption_platform: encryptedContent.platform,
        encryption_key_id: encryptedContent.keyId,
        encryption_seed_name: encryptedContent.seedName,
        encryption_derivation_path: encryptedContent.derivationPath,
      };
    } catch (error) {
      console.error('❌ Failed to encrypt content:', error);
      throw new Error('Failed to encrypt content');
    }
  }

  /**
   * Decrypt capsule content from a Capsule object
   */
  static async decryptCapsuleContent(capsule: Capsule): Promise<string> {
    try {
      // Check if this uses the new unified encryption format
      if (capsule.encryption_version === '2.0') {
        return await this.decryptUnifiedFormat(capsule);
      } else {
        // Fall back to old encryption format
        return await this.decryptLegacyFormat(capsule);
      }
    } catch (error) {
      console.error('❌ Failed to decrypt capsule content:', error);
      throw new Error('Failed to decrypt capsule content');
    }
  }

  /**
   * Decrypt capsule using new unified encryption format
   */
  private static async decryptUnifiedFormat(capsule: Capsule): Promise<string> {
    const unifiedContent: UnifiedEncryptedContent = {
      encryptedData: capsule.content_encrypted,
      platform: capsule.encryption_platform!,
      keyId: capsule.encryption_key_id,
      seedName: capsule.encryption_seed_name,
      derivationPath: capsule.encryption_derivation_path,
      createdAt: capsule.created_at,
      walletAddress: '', // Will be filled from context if needed
      version: '2.0',
    };

    const decryptedContent =
      await UnifiedEncryption.decryptContent(unifiedContent);

    // Verify content hash if available
    if (capsule.content_hash) {
      const computedHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        decryptedContent
      );

      if (computedHash !== capsule.content_hash) {
        console.warn('⚠️ Content hash mismatch - content may be corrupted');
      }
    }

    return decryptedContent;
  }

  /**
   * Decrypt capsule using legacy encryption format (pre-v2.0)
   */
  private static async decryptLegacyFormat(capsule: Capsule): Promise<string> {
    console.log('🔄 Decrypting legacy format capsule...');

    // For legacy capsules, we need to determine which wallet encrypted them
    // This is challenging without more metadata, so we'll make best effort

    // Try to find the user's wallet address from context
    // You might need to pass this as a parameter or get it from a global state
    // For now, we'll throw an error asking for explicit migration

    throw new Error(
      'This capsule was encrypted with an older version. ' +
        'Please contact support for migration assistance.'
    );
  }

  /**
   * Get encryption status and debug information
   */
  static async getEncryptionStatus(walletAddress: string): Promise<{
    available: boolean;
    platform: 'android' | 'ios';
    details: any;
  }> {
    return await UnifiedEncryption.getEncryptionInfo(walletAddress);
  }

  /**
   * Migrate legacy capsule to new encryption format
   * This would be used in a migration process
   */
  static async migrateLegacyCapsule(
    capsule: Capsule,
    legacyDecryptedContent: string,
    walletAddress: string
  ): Promise<{
    content_encrypted: string;
    content_hash: string;
    encryption_version: string;
    encryption_platform: 'android' | 'ios';
    encryption_key_id?: string;
    encryption_seed_name?: string;
    encryption_derivation_path?: string;
  }> {
    console.log('🔄 Migrating legacy capsule to unified encryption...');

    // Create a new encrypted version using unified encryption
    const migratedContent = await this.encryptContent(
      legacyDecryptedContent,
      walletAddress
    );

    console.log('✅ Legacy capsule migrated to unified encryption');
    return migratedContent;
  }

  /**
   * Validate that a capsule can be decrypted before attempting
   */
  static async validateCapsuleDecryption(capsule: Capsule): Promise<{
    canDecrypt: boolean;
    reason?: string;
    requiresMigration: boolean;
  }> {
    try {
      // Check encryption version
      if (!capsule.encryption_version || capsule.encryption_version !== '2.0') {
        return {
          canDecrypt: false,
          reason: 'Legacy encryption format not supported',
          requiresMigration: true,
        };
      }

      // Check platform compatibility
      if (
        capsule.encryption_platform &&
        capsule.encryption_platform !== require('react-native').Platform.OS
      ) {
        return {
          canDecrypt: false,
          reason: `Capsule encrypted on ${capsule.encryption_platform}, current platform is ${require('react-native').Platform.OS}`,
          requiresMigration: false,
        };
      }

      // Check if encryption is available
      const available = await UnifiedEncryption.isAvailable();
      if (!available) {
        return {
          canDecrypt: false,
          reason: 'Encryption system not available on this device',
          requiresMigration: false,
        };
      }

      return {
        canDecrypt: true,
        requiresMigration: false,
      };
    } catch (error) {
      return {
        canDecrypt: false,
        reason:
          error instanceof Error ? error.message : 'Unknown validation error',
        requiresMigration: false,
      };
    }
  }
}

/**
 * React hook for capsule encryption operations
 */
export function useCapsuleEncryption() {
  return {
    initialize: CapsuleEncryptionService.initialize,
    isAvailable: CapsuleEncryptionService.isEncryptionAvailable,
    encryptContent: CapsuleEncryptionService.encryptContent,
    decryptContent: CapsuleEncryptionService.decryptCapsuleContent,
    getStatus: CapsuleEncryptionService.getEncryptionStatus,
    validateDecryption: CapsuleEncryptionService.validateCapsuleDecryption,
  };
}
