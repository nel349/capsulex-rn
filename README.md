# CapsuleX – Encrypted Time Capsules on Solana

<div align="center">
<img width="400" alt="CapsuleX Screenshot" src="https://github.com/nel349/capsulex-rn/blob/main/assets/splash.png?raw=true" />
</div>

CapsuleX – Encrypted Time Capsules on Solana, aka. future-proof content with blockchain security

Turn your thoughts into time capsules.

Create encrypted time capsules that unlock at your chosen moment, schedule social posts for the future, and turn content into interactive guessing games — all secured by Solana blockchain and advanced encryption.

CapsuleX's technology powers "temporal content drops" — creating a powerful distribution channel for creators, brands, and communities through time-locked, encrypted content experiences.

## 1. Repositories & Demo Apps

| Purpose                  | Link                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| **Main mobile app**      | https://github.com/capsulex-org/capsulex-app-rn (Public)                                    |
| **Backend API**          | https://github.com/nel349/capsule-server (Private, contact team@capsulex.com)       |
| **Solana Program**       | https://github.com/nel349/capsule-server/tree/main/capsulex-program (Private, contact team@capsulex.com)       |
| iOS TestFlight           | [TestFlight](https://testflight.apple.com/join/qexjrHv7) (if not available, contact noell.lpz@gmail.com for access)                            |
| Android APK              | [Download APK](https://github.com/nel349/capsulex-rn/releases)  (download the latest release from assets)                              |                                              |

## 2. Architecture Overview

| Layer                | Tech                                                        | What It Does                                                                              |
| -------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Mobile**           | React Native + Expo                                        | Cross-platform native performance with fast iteration                                    |
| **Authentication**   | Dynamic.xyz + Solana Mobile Wallet Adapter                       | Email login with embedded wallet. Power users connect with hardware/mobile wallets.     |
| **Encryption**       | Platform-specific secure storage                            | iOS: Keychain Services, Android: Solana Mobile Seed Vault                               |
| **Core Flow**        | Time-lock → Encryption → Blockchain → Auto-reveal          | Content encrypted → stored on-chain → automatically revealed at scheduled time          |
| **Smart Contracts**  | Anchor Framework on Solana                                  | Time capsule creation, game mechanics, revelation, and NFT minting                      |
| **Content Storage**  | Encrypted on-chain + IPFS for media                        | All content encrypted before storage, media files on IPFS                               |
| **Social Features**  | X (Twitter) + Farcaster APIs                               | Schedule posts, notify audiences, cross-platform sharing                                |
| **Games**            | On-chain guessing mechanics                                 | Turn capsules into interactive games with leaderboards and rewards                      |

## 3. Feature Highlights

### 3-1. Advanced Encryption

Platform-specific secure encryption
- **iOS**: Secure Keychain-based encryption with biometric protection
- **Android**: Solana Mobile Seed Vault integration for hardware-backed security  
- **Unified API**: Cross-platform encryption service with automatic fallbacks

Encryption Service: https://github.com/your-org/capsulex-app-rn/blob/main/src/services/capsuleEncryptionService.ts

Unified Encryption: https://github.com/your-org/capsulex-app-rn/blob/main/src/utils/unifiedEncryption.ts

Sample Encryption Flow ▶ All content encrypted client-side before blockchain storage

### 3-2. Solana Program Integration

Time-locked content with blockchain security
- Capsule creation and revelation
- Game mechanics with guessing
- Leaderboard tracking
- NFT minting for special capsules

Program ID: `J1r7tHjxEuCcSYVrikUKxzyeeccuC3QbyHjUbY8Pw7uH`

Solana Integration:  https://github.com/your-org/capsulex-app-rn/blob/main/src/solana/useCapsulexProgram.ts

Sample Transaction ▶ https://solscan.io/tx/sample-transaction-hash?cluster=devnet

### 3-3. Social Media Integration

Scheduled posting and audience engagement
- X (Twitter) integration for scheduled posts
- Farcaster support for decentralized social
- Audience notifications for capsule reveals

Social Service: https://github.com/your-org/capsulex-app-rn/blob/main/src/services/twitterService.ts

### 3-4. Gamification

Interactive guessing games
- Turn capsules into community games
- Semantic validation for guesses
- Leaderboards and achievements
- Creator validation tools

Game Mechanics: https://github.com/your-org/capsulex-app-rn/blob/main/src/screens/CreatorValidationScreen.tsx

### 3-5. Modular Architecture

Scalable component system
- Step-by-step capsule creation flow
- Reusable UI components
- Clean separation of concerns
- Easy feature additions

Component System: https://github.com/your-org/capsulex-app-rn/tree/main/src/components/create-capsule

## 4. Quick Start

### Prerequisites
- Node.js (v18+)
- Expo CLI
- iOS Simulator or Android Emulator

### Installation
```bash
git clone https://github.com/your-org/capsulex-app-rn.git
cd capsulex-app-rn
npm install
cp .env.example .env
npm start
```

### Environment Variables
```env
EXPO_PUBLIC_API_BASE_URL=https://api.capsulex.com
EXPO_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
EXPO_PUBLIC_DYNAMIC_PROJECT_ID=your-dynamic-project-id
EXPO_PUBLIC_CAPSULEX_PROGRAM_ID=J1r7tHjxEuCcSYVrikUKxzyeeccuC3QbyHjUbY8Pw7uH
```

## 5. Development Commands

```bash
# Start development server
npm start

# Run on platforms
npm run ios
npm run android

# Code quality
npm run typecheck
npm run lint

# Testing
npm test
npm run test:coverage
```

## 6. Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── capsules/       # Capsule-related components  
│   ├── create-capsule/ # Modular creation flow
│   └── ui/             # Base UI components
├── hooks/              # Custom React hooks
├── navigators/         # Navigation configuration
├── providers/          # Context providers
├── screens/            # Screen components
├── services/           # API and external services
├── solana/             # Solana program interactions
├── types/              # TypeScript definitions
└── utils/              # Utility functions
```

## 7. Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Framework** | React Native + Expo | Cross-platform mobile development |
| **Language** | TypeScript | Type-safe development |
| **State Management** | React Context + TanStack React Query | Global state and server state |
| **Navigation** | React Navigation v6 | Screen navigation |
| **UI Components** | React Native Paper | Material Design components |
| **Blockchain** | Solana Web3.js + Anchor | Blockchain interactions |
| **Authentication** | Dynamic.xyz + Mobile Wallet Adapter | User authentication |
| **Backend** | Node.js + Express | API and database |

## 8. Security Features

- **End-to-End Encryption**: All content encrypted before blockchain storage
- **Platform Security**: iOS Keychain + Android Seed Vault integration  
- **Blockchain Verification**: Content integrity verified on Solana
- **No Plain Text Storage**: Encrypted content never stored in plain text
- **Biometric Protection**: Device-level security for encryption keys

## 9. Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`  
3. Make changes and test: `npm test && npm run lint`
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open Pull Request

## 10. License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
