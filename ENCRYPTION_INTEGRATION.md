# CapsuleX Unified Encryption Integration Guide

This guide explains how to integrate the new unified encryption system that uses Solana Mobile Seed Vault for Android and VaultKeyManager for iOS.

## 🏗️ Architecture Overview

### Android (Solana Mobile Seed Vault)
- Uses hardware-backed seed storage
- Requires user authorization for seed access
- Provides cryptographically strong encryption
- Works only on Solana Mobile devices

### iOS (VaultKeyManager)
- Uses Expo SecureStore for key storage
- Automatic key generation
- Works on all iOS devices
- Maintains existing functionality

## 📦 Components Created

### 1. `UnifiedEncryption` (`src/utils/unifiedEncryption.ts`)
Main encryption service that handles platform detection and routing.

### 2. `CapsuleEncryptionService` (`src/services/capsuleEncryptionService.ts`)
High-level service for capsule-specific encryption operations.

### 3. `EncryptionDemo` (`src/components/encryption/EncryptionDemo.tsx`)
Demo component for testing the encryption system.

## 🔧 Usage Examples

### Initialize Encryption
```typescript
import { useCapsuleEncryption } from '../services/capsuleEncryptionService';

const capsuleEncryption = useCapsuleEncryption();

// Initialize for a wallet address
await capsuleEncryption.initialize(walletAddress);
```

### Encrypt Capsule Content
```typescript
const createRequest = await capsuleEncryption.encryptContent(
  'My secret message',
  walletAddress,
  {
    has_media: false,
    media_urls: [],
    reveal_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    is_gamified: false,
  }
);

// Send createRequest to your API
```

### Decrypt Capsule Content
```typescript
// From a Capsule object received from API
const decryptedContent = await capsuleEncryption.decryptContent(capsule);
```

## 🔄 Migration Strategy

### New Capsules
All new capsules will automatically use the unified encryption system (version 2.0).

### Legacy Capsules
- Legacy capsules (without `encryption_version` or version < 2.0) will show a migration notice
- The system includes validation to check if a capsule can be decrypted
- Migration functions are available but require manual intervention

### Checking Decryption Capability
```typescript
const validation = await capsuleEncryption.validateDecryption(capsule);
if (!validation.canDecrypt) {
  console.log('Cannot decrypt:', validation.reason);
  if (validation.requiresMigration) {
    // Show migration UI
  }
}
```

## 📱 Platform-Specific Behavior

### Android Integration
1. **First-time setup**: User will be prompted to authorize seeds
2. **Seed management**: Users can see authorized seeds in system settings
3. **Hardware security**: Keys are stored in secure hardware when available

### iOS Integration
1. **Automatic setup**: Vault keys are created transparently
2. **Device-bound**: Keys are tied to the specific device
3. **Secure storage**: Uses iOS Keychain via Expo SecureStore

## 🧪 Testing with Demo Component

Add the EncryptionDemo to any screen for testing:

```typescript
import EncryptionDemo from '../components/encryption/EncryptionDemo';

function YourScreen() {
  const [showDemo, setShowDemo] = useState(false);
  const walletAddress = 'your-wallet-address';

  return (
    <View>
      <Button onPress={() => setShowDemo(true)}>
        Test Encryption
      </Button>
      <EncryptionDemo 
        visible={showDemo}
        onDismiss={() => setShowDemo(false)}
        walletAddress={walletAddress}
      />
    </View>
  );
}
```

## 🔍 Debugging and Status

### Check Encryption Status
```typescript
const status = await unifiedEncryption.getEncryptionInfo(walletAddress);
console.log('Platform:', status.platform);
console.log('Available:', status.available);
console.log('Details:', status.details);
```

### Android-specific Debug Info
- `authorizedSeeds`: Number of authorized seeds
- `hasUnauthorizedSeeds`: Whether there are seeds needing authorization
- `seedNames`: Names of authorized seeds

### iOS-specific Debug Info
- `hasVaultKey`: Whether a vault key exists
- `keyInfo`: Metadata about the vault key

## ⚠️ Important Notes

1. **Android Requirements**: Solana Mobile Seed Vault only works on compatible devices
2. **Backwards Compatibility**: Old encryption formats are not automatically supported
3. **Key Management**: Users are responsible for seed/key backup on their respective platforms
4. **Cross-platform**: Capsules encrypted on Android cannot be decrypted on iOS and vice versa

## 🚀 Next Steps

1. **Test the system** using the EncryptionDemo component
2. **Integrate into capsule creation** flow in your CreateCapsuleScreen
3. **Update capsule display** logic to handle new encryption format
4. **Plan migration strategy** for existing users with legacy capsules
5. **Update API** to handle new encryption metadata fields

## 📞 Support

For issues with:
- **Seed Vault**: Check Solana Mobile documentation
- **iOS KeyChain**: Check Expo SecureStore documentation
- **General encryption**: Review the unified encryption implementation

The system is designed to be robust and provide clear error messages for debugging.
