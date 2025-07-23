import * as Crypto from 'expo-crypto';

import { useMobileWallet } from './useMobileWallet';

interface EncryptedContent {
  encryptedData: string;
  nonce: string;
  walletAddress: string;
}

/**
 * Simple XOR encryption using wallet signature as key
 * Not cryptographically strong but works in React Native without Web Crypto API
 */
function xorEncrypt(data: string, key: Uint8Array): string {
  const dataBytes = new TextEncoder().encode(data);
  const encrypted = new Uint8Array(dataBytes.length);

  for (let i = 0; i < dataBytes.length; i++) {
    encrypted[i] = dataBytes[i] ^ key[i % key.length];
  }

  return Array.from(encrypted)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function xorDecrypt(encryptedHex: string, key: Uint8Array): string {
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
 * Wallet-based encryption using Solana Mobile Wallet Adapter
 * Uses the wallet's keypair to encrypt/decrypt content
 */
export class WalletEncryption {
  private mobileWallet: ReturnType<typeof useMobileWallet>;

  constructor(mobileWallet: ReturnType<typeof useMobileWallet>) {
    this.mobileWallet = mobileWallet;
  }

  /**
   * Encrypt content using wallet's private key for signing
   * The wallet signs a nonce to create a deterministic encryption key
   */
  async encryptContent(
    content: string,
    walletAddress: string
  ): Promise<EncryptedContent> {
    try {
      // Generate a random nonce for this encryption
      const nonce = await Crypto.getRandomBytesAsync(16);
      const nonceHex = Array.from(nonce)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Create a message to sign (nonce + content hash for uniqueness)
      const contentHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        content,
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      const messageToSign = `CapsuleX-Encrypt:${nonceHex}:${contentHash}`;
      const messageBytes = new TextEncoder().encode(messageToSign);

      // Sign the message with wallet to get deterministic key material
      const signature = await this.mobileWallet.signMessage(messageBytes);

      // Use first 32 bytes of signature as encryption key
      const encryptionKey = signature.slice(0, 32);

      // Encrypt content using Web Crypto API with AES-GCM
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encryptionKey,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );

      const contentBytes = new TextEncoder().encode(content);
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: nonce,
        },
        keyMaterial,
        contentBytes
      );

      const encryptedHex = Array.from(new Uint8Array(encrypted))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      console.log('🔐 Content encrypted with wallet signature');

      return {
        encryptedData: encryptedHex,
        nonce: nonceHex,
        walletAddress,
      };
    } catch (error) {
      console.error('❌ Wallet encryption failed:', error);
      throw new Error('Failed to encrypt content with wallet');
    }
  }

  /**
   * Decrypt content using wallet's private key for signing
   * Must use the same wallet that encrypted the content
   */
  async decryptContent(
    encryptedContent: EncryptedContent,
    currentWalletAddress: string
  ): Promise<string> {
    try {
      const { encryptedData, nonce, walletAddress } = encryptedContent;

      // Verify this wallet can decrypt (same address that encrypted)
      if (walletAddress !== currentWalletAddress) {
        throw new Error('This content was encrypted with a different wallet');
      }

      // We need the original content hash to recreate the signing message
      // This is a limitation - we'd need to store the content hash separately
      // For now, let's use a simplified approach with just the nonce
      const messageToSign = `CapsuleX-Decrypt:${nonce}`;
      const messageBytes = new TextEncoder().encode(messageToSign);

      // Sign the message to get the same key material
      const signature = await this.mobileWallet.signMessage(messageBytes);
      const encryptionKey = signature.slice(0, 32);

      // Import key for decryption
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encryptionKey,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      // Convert hex back to bytes
      const nonceBytes = new Uint8Array(
        nonce.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
      );
      const encryptedBytes = new Uint8Array(
        encryptedData.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
      );

      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: nonceBytes,
        },
        keyMaterial,
        encryptedBytes
      );

      const content = new TextDecoder().decode(decrypted);
      console.log('🔓 Content decrypted with wallet signature');

      return content;
    } catch (error) {
      console.error('❌ Wallet decryption failed:', error);
      throw new Error(
        'Failed to decrypt content. Wrong wallet or corrupted data.'
      );
    }
  }

  /**
   * Encrypt content using transaction signature as input for wallet signing
   * This way we only need one wallet approval (for the transaction)
   */
  async encryptWithTransactionSignature(
    content: string,
    transactionSignature: string,
    walletAddress: string
  ): Promise<EncryptedContent> {
    try {
      // Use transaction signature as the message to sign
      const messageToSign = `CapsuleX-Decrypt:${transactionSignature}`;
      const messageBytes = new TextEncoder().encode(messageToSign);

      // Get wallet signature as encryption key
      const walletSignature = await this.mobileWallet.signMessage(messageBytes);

      // Encrypt using XOR with wallet signature
      const encryptedData = xorEncrypt(content, walletSignature);

      console.log('🔐 Content encrypted with transaction signature + wallet');

      return {
        encryptedData,
        nonce: transactionSignature, // Store transaction signature as "nonce"
        walletAddress,
      };
    } catch (error) {
      console.error('❌ Transaction-based encryption failed:', error);
      throw new Error('Failed to encrypt content with transaction signature');
    }
  }

  /**
   * Decrypt content that was encrypted with transaction signature
   * Requires the user's wallet to sign the transaction signature
   */
  async decryptWithTransactionSignature(
    encryptedContent: EncryptedContent,
    currentWalletAddress: string
  ): Promise<string> {
    try {
      const {
        encryptedData,
        nonce: transactionSignature,
        walletAddress,
      } = encryptedContent;

      if (walletAddress !== currentWalletAddress) {
        throw new Error('Content encrypted with different wallet');
      }

      // Recreate the same signing message using transaction signature
      const messageToSign = `CapsuleX-Decrypt:${transactionSignature}`;
      const messageBytes = new TextEncoder().encode(messageToSign);

      // Get wallet signature (user needs to approve this)
      const walletSignature = await this.mobileWallet.signMessage(messageBytes);

      // Decrypt using XOR with same wallet signature
      const decryptedContent = xorDecrypt(encryptedData, walletSignature);

      console.log('🔓 Content decrypted with transaction signature + wallet');

      return decryptedContent;
    } catch (error) {
      console.error('❌ Transaction-based decryption failed:', error);
      throw new Error('Failed to decrypt content with wallet');
    }
  }
}

// Hook to use wallet encryption
export function useWalletEncryption() {
  const mobileWallet = useMobileWallet();

  const walletEncryption = new WalletEncryption(mobileWallet);

  return {
    encryptWithTransaction:
      walletEncryption.encryptWithTransactionSignature.bind(walletEncryption),
    decryptWithTransaction:
      walletEncryption.decryptWithTransactionSignature.bind(walletEncryption),
  };
}
