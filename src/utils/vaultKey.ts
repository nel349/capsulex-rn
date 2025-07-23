import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const VAULT_KEY_STORAGE_KEY = 'capsulex_vault_key';
const VAULT_KEY_INFO_KEY = 'capsulex_vault_key_info';

export interface VaultKeyInfo {
  keyId: string;
  createdAt: string;
  deviceName: string;
  walletAddress?: string;
  isBackedUp: boolean;
}

export interface EncryptedContent {
  encryptedData: string;
  keyId: string;
  createdAt: string;
  walletAddress: string;
}

/**
 * Vault Key Management for CapsuleX
 * Handles device-based encryption keys for secure content storage
 */
export class VaultKeyManager {
  /**
   * Generate a new vault key and store it securely on device
   */
  static async generateVaultKey(walletAddress?: string): Promise<VaultKeyInfo> {
    // Generate 256-bit random key
    const keyBytes = await Crypto.getRandomBytesAsync(32);
    const keyHex = Array.from(keyBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Create key info
    const keyId = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      keyHex + Date.now().toString()
    );

    const keyInfo: VaultKeyInfo = {
      keyId: keyId.slice(0, 16), // Short ID for display
      createdAt: new Date().toISOString(),
      deviceName: 'This Device', // Could be enhanced with actual device name
      walletAddress,
      isBackedUp: false,
    };

    // Store key securely
    await SecureStore.setItemAsync(VAULT_KEY_STORAGE_KEY, keyHex);
    await SecureStore.setItemAsync(VAULT_KEY_INFO_KEY, JSON.stringify(keyInfo));

    console.log('🔐 Vault key generated:', keyInfo.keyId);
    return keyInfo;
  }

  /**
   * Get the current vault key info (metadata only, not the actual key)
   */
  static async getVaultKeyInfo(): Promise<VaultKeyInfo | null> {
    try {
      const infoJson = await SecureStore.getItemAsync(VAULT_KEY_INFO_KEY);
      return infoJson ? JSON.parse(infoJson) : null;
    } catch (error) {
      console.error('Failed to get vault key info:', error);
      return null;
    }
  }

  /**
   * Check if vault key exists
   */
  static async hasVaultKey(): Promise<boolean> {
    try {
      const keyHex = await SecureStore.getItemAsync(VAULT_KEY_STORAGE_KEY);
      return !!keyHex;
    } catch (error) {
      console.error('Failed to check vault key existence:', error);
      return false;
    }
  }

  /**
   * Get or create vault key
   */
  static async getOrCreateVaultKey(
    walletAddress?: string
  ): Promise<Uint8Array> {
    try {
      let keyHex = await SecureStore.getItemAsync(VAULT_KEY_STORAGE_KEY);

      if (!keyHex) {
        console.log('🔐 No vault key found, generating new one...');
        await this.generateVaultKey(walletAddress);
        keyHex = await SecureStore.getItemAsync(VAULT_KEY_STORAGE_KEY);
      }

      if (!keyHex) {
        throw new Error('Failed to create vault key');
      }

      // Convert hex to bytes
      const keyBytes = new Uint8Array(
        keyHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
      );

      return keyBytes;
    } catch (error) {
      console.error('Failed to get/create vault key:', error);
      throw new Error('Vault key error: Unable to access encryption key');
    }
  }

  /**
   * Encrypt content using vault key
   */
  static async encryptContent(
    content: string,
    walletAddress: string
  ): Promise<EncryptedContent> {
    const vaultKey = await this.getOrCreateVaultKey(walletAddress);
    const keyInfo = await this.getVaultKeyInfo();

    // XOR encryption
    const dataBytes = new TextEncoder().encode(content);
    const encrypted = new Uint8Array(dataBytes.length);

    for (let i = 0; i < dataBytes.length; i++) {
      encrypted[i] = dataBytes[i] ^ vaultKey[i % vaultKey.length];
    }

    const encryptedHex = Array.from(encrypted)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    console.log('🔐 Content encrypted with vault key');

    return {
      encryptedData: encryptedHex,
      keyId: keyInfo?.keyId || 'unknown',
      createdAt: new Date().toISOString(),
      walletAddress,
    };
  }

  /**
   * Decrypt content using vault key
   */
  static async decryptContent(
    encryptedContent: EncryptedContent
  ): Promise<string> {
    const vaultKey = await this.getOrCreateVaultKey();

    // Convert hex to bytes
    const encryptedBytes = new Uint8Array(
      encryptedContent.encryptedData
        .match(/.{2}/g)!
        .map(byte => parseInt(byte, 16))
    );

    // XOR decryption
    const decrypted = new Uint8Array(encryptedBytes.length);
    for (let i = 0; i < encryptedBytes.length; i++) {
      decrypted[i] = encryptedBytes[i] ^ vaultKey[i % vaultKey.length];
    }

    const content = new TextDecoder().decode(decrypted);
    console.log('🔓 Content decrypted with vault key');

    return content;
  }

  /**
   * Export vault key for backup (show to user for manual backup)
   */
  static async exportVaultKey(): Promise<string | null> {
    try {
      const keyHex = await SecureStore.getItemAsync(VAULT_KEY_STORAGE_KEY);
      return keyHex;
    } catch (error) {
      console.error('Failed to export vault key:', error);
      return null;
    }
  }

  /**
   * Import vault key from backup
   */
  static async importVaultKey(
    keyHex: string,
    walletAddress?: string
  ): Promise<VaultKeyInfo> {
    // Validate key format
    if (!/^[0-9a-f]{64}$/i.test(keyHex)) {
      throw new Error('Invalid vault key format');
    }

    // Create new key info
    const keyId = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      keyHex + Date.now().toString()
    );

    const keyInfo: VaultKeyInfo = {
      keyId: keyId.slice(0, 16),
      createdAt: new Date().toISOString(),
      deviceName: 'This Device (Imported)',
      walletAddress,
      isBackedUp: true, // Imported keys are considered backed up
    };

    // Store imported key
    await SecureStore.setItemAsync(VAULT_KEY_STORAGE_KEY, keyHex);
    await SecureStore.setItemAsync(VAULT_KEY_INFO_KEY, JSON.stringify(keyInfo));

    console.log('🔐 Vault key imported:', keyInfo.keyId);
    return keyInfo;
  }

  /**
   * Delete vault key (WARNING: This will make encrypted content unreadable!)
   */
  static async deleteVaultKey(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(VAULT_KEY_STORAGE_KEY);
      await SecureStore.deleteItemAsync(VAULT_KEY_INFO_KEY);
      console.log('🗑️ Vault key deleted');
    } catch (error) {
      console.error('Failed to delete vault key:', error);
      throw new Error('Failed to delete vault key');
    }
  }

  /**
   * Mark vault key as backed up
   */
  static async markAsBackedUp(): Promise<void> {
    const keyInfo = await this.getVaultKeyInfo();
    if (keyInfo) {
      keyInfo.isBackedUp = true;
      await SecureStore.setItemAsync(
        VAULT_KEY_INFO_KEY,
        JSON.stringify(keyInfo)
      );
    }
  }
}
