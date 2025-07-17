
// Privy configuration for CapsuleX
export const PRIVY_CONFIG = {
    // TODO: Replace with your actual Privy app ID and client ID from the dashboard
    appId: process.env.EXPO_PUBLIC_PRIVY_APP_ID,
    clientId: process.env.EXPO_PUBLIC_PRIVY_APP_CLIENT_ID,
  
    // Privy configuration options
    config: {
      appearance: {
        theme: 'light' as const,
        accentColor: '#2196F3',
        logo: undefined, // Can add your logo URL here
      },
  
      // loginMethods: ['email', 'sms', 'apple', 'google'] as const,
  
      embedded: {
        solana: {
          createOnLogin: 'all-users' as const,
        },
      },
  
      mfa: {
        noPromptOnMfaRequired: false,
        relyingParty: 'CapsuleX',
      },
  
      // legal: {
      //   termsAndConditionsUrl: 'https://capsulex.app/terms',
      //   privacyPolicyUrl: 'https://capsulex.app/privacy',
      // },
  
      // additionalChains: [
      //   // Solana configuration
      //   {
      //     id: 101, // Solana mainnet
      //     name: 'Solana',
      //     nativeCurrency: {
      //       name: 'Solana',
      //       symbol: 'SOL',
      //       decimals: 9,
      //     },
      //     rpcUrls: ['https://api.mainnet-beta.solana.com'],
      //     blockExplorerUrls: ['https://explorer.solana.com'],
      //   },
      //   {
      //     id: 103, // Solana devnet
      //     name: 'Solana Devnet',
      //     nativeCurrency: {
      //       name: 'Solana',
      //       symbol: 'SOL',
      //       decimals: 9,
      //     },
      //     rpcUrls: ['https://api.devnet.solana.com'],
      //     blockExplorerUrls: ['https://explorer.solana.com/?cluster=devnet'],
      //   },
      // ],
    },
  };
  
  // Validation function to check if Privy is properly configured
  export const isPrivyConfigured = (): boolean => {
    return (
      PRIVY_CONFIG.appId !== 'your-privy-app-id' &&
      PRIVY_CONFIG.clientId !== 'your-privy-client-id' &&
      !!process.env.EXPO_PUBLIC_PRIVY_APP_ID &&
      !!process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID
    );
  };
  
  // Development mode configuration
  export const isDevelopmentMode = (): boolean => {
    return __DEV__ || process.env.NODE_ENV === 'development';
  };
  