import * as anchor from '@coral-xyz/anchor';
import MaterialCommunityIcon from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import type { Address } from '@solana/kit';
import * as Crypto from 'expo-crypto';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Platform,
  Pressable,
  Image,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Chip,
  Portal,
  Modal,
  Switch,
} from 'react-native-paper';

import DateTimePickerModal from '../components/DateTimePickerModal';
import {
  TourGuide,
  hasCompletedTour,
  type TourStep,
} from '../components/tour/TourGuide';
import { AppSnackbar } from '../components/ui/AppSnackbar';
import { useSnackbar } from '../hooks/useSnackbar';
import { useDualAuth } from '../providers';
import { apiService } from '../services/api';
import { CapsuleEncryptionService } from '../services/capsuleEncryptionService';
import { useCapsuleService } from '../services/capsuleService';
import { useBalance, useSolanaService } from '../services/solana';
import { twitterService } from '../services/twitterService';
import { useCapsulexProgram } from '../solana/useCapsulexProgram';
import {
  colors,
  typography,
  spacing,
  layout,
  shadows,
  components,
} from '../theme';

interface SOLBalance {
  balance: number;
  sufficient: boolean;
  required: number;
}

type CreateMode = 'time_capsule' | 'social_post';

export function CreateCapsuleScreen() {
  const [showTour, setShowTour] = useState(false);
  const { isAuthenticated, walletAddress, connectWallet } = useDualAuth();
  const { createCapsule } = useCapsulexProgram();
  const { createCapsule: createCapsuleInDB } = useCapsuleService();

  // Mode selection
  const [createMode, setCreateMode] = useState<CreateMode>('time_capsule');

  const [content, setContent] = useState('');
  const [selectedPlatform, setSelectedPlatform] =
    useState<'twitter' | 'farcaster'>('twitter');
  const [revealDateTime, setRevealDateTime] = useState(new Date()); // Combined Date and Time
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSOLModal, setShowSOLModal] = useState(false);

  const { data: balance } = useBalance(walletAddress as unknown as Address);
  const [solBalance, setSolBalance] = useState<SOLBalance>({
    balance: balance || 0,
    sufficient: true,
    required: 0.0014, // Updated for V1 pricing: ~$0.25 at $180/SOL
  });
  const [showVaultKeyInfo, setShowVaultKeyInfo] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [notifyAudience, setNotifyAudience] = useState(false);
  const [isTwitterConnected, setIsTwitterConnected] = useState(false);
  const [isGamified, setIsGamified] = useState(false);
  const { snackbar, showError, showSuccess, showInfo, hideSnackbar } =
    useSnackbar();
  const { getBalance } = useSolanaService();

  const platforms = [
    { key: 'twitter', label: 'X', icon: 'custom-x', customIcon: require('../../assets/icons8-x-30.png') },
    { key: 'farcaster', label: 'Farcaster', icon: 'custom-farcaster', customIcon: require('../../assets/farcaster-transparent-purple.png') }
  ];

  // Define create capsule tour steps
  const createCapsuleTourSteps: TourStep[] = [
    {
      id: '1',
      title: 'Welcome to Create! ✨',
      description:
        "This is where you can create amazing time capsules or schedule social posts. Let's explore all the options!",
      icon: 'package-variant-closed',
      position: 'center',
    },
    {
      id: '2',
      title: 'Choose Your Creation Mode 🎯',
      description:
        'Select between Time Capsule (encrypted content on blockchain) or Social Post (scheduled X posts).',
      icon: 'pencil',
      position: 'top',
    },
    {
      id: '3',
      title: 'SOL Balance & Fees 💰',
      description:
        'Check your SOL balance here. Both modes require a small fee (~$0.25) to cover blockchain or service costs.',
      icon: 'wallet',
      position: 'top',
    },
    {
      id: '4',
      title: 'Gamification Toggle 🎮',
      description:
        'For time capsules, enable gamification to let others guess your content and compete for points!',
      icon: 'gamepad-variant',
      position: 'center',
    },
    {
      id: '5',
      title: 'Write Your Content ✍️',
      description:
        'Enter your message or post content. For time capsules, this will be encrypted and stored securely.',
      icon: 'message-text',
      position: 'center',
    },
    {
      id: '6',
      title: 'Audience Notifications 📢',
      description:
        'For time capsules, choose whether to notify your X followers about your new capsule.',
      icon: 'bullhorn',
      position: 'center',
    },
    {
      id: '7',
      title: 'Schedule Your Reveal ⏰',
      description:
        'Set when your capsule should be revealed or your post should go live. Everything happens automatically!',
      icon: 'calendar-clock',
      position: 'bottom',
    },
    {
      id: '8',
      title: 'Ready to Create! 🚀',
      description:
        'Once everything looks good, hit the create button to make your capsule or schedule your post. Your content will be processed automatically!',
      icon: 'rocket-launch',
      position: 'bottom',
    },
  ];

  // Check if tour should be shown
  useEffect(() => {
    const checkTour = async () => {
      if (isAuthenticated) {
        const completed = await hasCompletedTour('create_capsule_screen_tour');
        setShowTour(!completed);
      }
    };
    checkTour();
  }, [isAuthenticated]);

  useEffect(() => {
    checkSOLBalance();
  }, [getBalance, walletAddress, createMode, isGamified]);

  // Check if user is creating their first capsule (unified encryption)
  const checkFirstTimeUser = async () => {
    if (!walletAddress) return;

    try {
      // Check unified encryption availability
      const isAvailable =
        await CapsuleEncryptionService.isEncryptionAvailable();
      const status =
        await CapsuleEncryptionService.getEncryptionStatus(walletAddress);

      console.log('🔍 Unified encryption status:', status);

      // For iOS, check if vault key exists
      // For Android, check if seed vault is authorized
      const isFirstTime =
        !isAvailable ||
        (status.platform === 'ios' && !status.details.hasVaultKey) ||
        (status.platform === 'android' && status.details.authorizedSeeds === 0);

      setIsFirstTimeUser(isFirstTime);
      setShowVaultKeyInfo(isFirstTime); // Show info card for first-time users
    } catch (error) {
      console.error('Failed to check encryption status:', error);
      setIsFirstTimeUser(true); // Default to first time user on error
    }
  };

  // Check Twitter connection status
  const checkTwitterConnection = async () => {
    try {
      const connected = await twitterService.isTwitterConnected();
      setIsTwitterConnected(connected);
    } catch (error) {
      console.error('Failed to check Twitter connection:', error);
      setIsTwitterConnected(false);
    }
  };

  useEffect(() => {
    checkFirstTimeUser();
    checkTwitterConnection();
  }, [walletAddress]);

  // Refresh vault key status when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      checkFirstTimeUser();
      checkTwitterConnection();
    }, [walletAddress])
  );

  const checkSOLBalance = async () => {
    const balance = await getBalance(walletAddress as unknown as Address);

    // Calculate required SOL based on V1 pricing structure
    let required: number;
    if (createMode === 'social_post') {
      // Social posts: Just Twitter scheduling (~$0.25 = ~0.0014 SOL at $180/SOL)
      required = 0.0014;
    } else if (isGamified) {
      // Gamified time capsules: $0.25 capsule creation + creator pays validation costs
      // Creator bears semantic validation costs (~$0.003 per guess) outside of this fee
      // Users pay $0.01 per guess to platform (not shown here - handled in guess submission)
      required = 0.0014; // ~$0.25 capsule creation fee at $180/SOL
    } else {
      // Regular time capsules: $0.25 capsule creation fee
      required = 0.0014; // ~$0.25 capsule creation fee at $180/SOL
    }

    setSolBalance({
      balance: balance || 0,
      sufficient: balance >= required,
      required,
    });
  };

  const openDateTimePicker = () => {
    setShowDateTimePicker(true);
  };

  const attemptReconnectionAndRetry = async (): Promise<boolean> => {
    try {
      showInfo('Attempting to reconnect your wallet...');
      await connectWallet();

      // Check if wallet is now connected by verifying we have a wallet address
      if (walletAddress) {
        showInfo('Wallet reconnected! Retrying capsule creation...');
        // Small delay to let the UI update
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
      } else {
        if (Platform.OS === 'ios') {
          showError(
            'Reconnection failed. Please try connecting your wallet again.'
          );
        } else {
          showError('Please restart the app and reconnect your wallet.');
        }
        return false;
      }
    } catch (reconnectionError) {
      console.error('Reconnection attempt failed:', reconnectionError);
      showError(
        'Reconnection failed. Please restart the app and reconnect your wallet.'
      );
      return false;
    }
  };

  const handleCreateSocialPost = async () => {
    try {
      console.log('📱 Creating social post...');

      // Call the social post API endpoint
      const response = await apiService.post('/scheduler/social-post', {
        post_content: content,
        scheduled_for: revealDateTime.toISOString(),
      });

      if (response.success) {
        console.log('✅ Social post scheduled:', response.data);

        showSuccess(
          `📱 Social post scheduled successfully! It will be posted on ${revealDateTime.toLocaleDateString()} at ${revealDateTime.toLocaleTimeString()}.`
        );

        // Reset form after short delay
        setTimeout(() => {
          setContent('');
          setRevealDateTime(new Date());
        }, 2000);
      } else {
        console.error('❌ Social post scheduling failed:', response.error);
        showError(`Failed to schedule social post: ${response.error}`);
      }
    } catch (error) {
      console.error('❌ Error scheduling social post:', error);
      showError(
        `Failed to schedule social post: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCapsule = async (isRetry: boolean = false) => {
    if (!content.trim()) {
      showError(
        createMode === 'time_capsule'
          ? 'Please enter content for your capsule'
          : 'Please enter content for your post'
      );
      return;
    }

    if (!revealDateTime) {
      showError(
        createMode === 'time_capsule'
          ? 'Please select a reveal date and time'
          : 'Please select when to post'
      );
      return;
    }

    if (!isAuthenticated) {
      showError('Please connect your wallet first');
      return;
    }

    // Both modes require SOL balance (time capsules for blockchain fees, social posts for service fees)
    if (!solBalance.sufficient) {
      setShowSOLModal(true);
      return;
    }

    setIsLoading(true);

    // Handle social post mode differently
    if (createMode === 'social_post') {
      return handleCreateSocialPost();
    }

    try {
      // Convert to Unix timestamp (seconds) and then to Anchor BN
      const revealDateBN = new anchor.BN(
        Math.floor(revealDateTime.getTime() / 1000)
      );

      const contentStorage = { text: {} };
      // Content hash is generated as part of the unified encryption process

      // console.log('🐛 Debug info before createCapsule:');
      // console.log('- createCapsule object:', createCapsule);
      // console.log('- createCapsule.mutateAsync:', createCapsule?.mutateAsync);
      // console.log('- selectedAccount:', selectedAccount);
      // await CapsuleEncryptionService.testSeedVault();
      // Step 1: Initialize and encrypt content using unified encryption
      showInfo('Initializing encryption system...');

      try {
        // Initialize unified encryption (handles both Android Seed Vault and iOS Vault Key)
        await CapsuleEncryptionService.initialize(walletAddress as string);
        console.log('✅ Unified encryption initialized');
      } catch (initError) {
        console.error('❌ Encryption initialization failed:', initError);
        showError('Failed to initialize encryption system. Please try again.');
        return;
      }

      showInfo('Encrypting your content securely...');

      // Encrypt only the content - all other data stays unencrypted
      let encryptionResult;
      try {
        encryptionResult = await CapsuleEncryptionService.encryptContent(
          content,
          walletAddress as string
        );
        console.log('🔐 Content encrypted (content only)');
      } catch (encryptionError) {
        console.error('❌ Content encryption failed:', encryptionError);

        const errorMessage =
          encryptionError instanceof Error
            ? encryptionError.message
            : String(encryptionError);

        if (errorMessage.includes('NEED_NEW_SEED')) {
          showError(
            '⚠️ Seed Vault authorization expired. Please:\n\n1. Open the Seed Vault Simulator app\n2. Create a new seed\n3. Return here and try again\n\nEncryption is required for capsule security.'
          );
        } else if (
          errorMessage.includes('Seed Vault') ||
          errorMessage.includes('authorization')
        ) {
          showError(
            '⚠️ Seed Vault setup required. Please go to Profile → Seed Vault Management to set up encryption again. Encryption is mandatory for capsule security.'
          );
        } else {
          showError(
            'Failed to encrypt content. Encryption is required for capsule security. Please try again.'
          );
        }
        return;
      }

      // Step 2: Create capsule on blockchain (ONLY wallet signature needed!)
      const blockchainPlaceholder = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `ENCRYPTED_CONTENT_${walletAddress}_${Date.now()}`
      );

      const txResult = await createCapsule.mutateAsync({
        encryptedContent: blockchainPlaceholder, // Placeholder hash on blockchain
        contentStorage: contentStorage,
        contentIntegrityHash: encryptionResult.content_hash,
        revealDate: revealDateBN,
        isGamified: isGamified,
      });

      console.log('✅ Capsule created on-chain:', txResult);

      // Step 3: Save capsule to Supabase database with encryption metadata
      try {
        const capsuleData = await createCapsuleInDB({
          // Unencrypted metadata
          has_media: false,
          media_urls: [],
          reveal_date: revealDateTime.toISOString(),
          created_at: new Date().toISOString(),
          sol_fee_amount: solBalance.required,
          is_gamified: isGamified,
          on_chain_tx:
            typeof txResult === 'string'
              ? txResult
              : (txResult as any)?.signature || JSON.stringify(txResult),
          // Only the content and encryption metadata
          ...encryptionResult, // Contains encrypted content + encryption metadata
        });

        console.log('✅ Capsule saved to database:', capsuleData);

        // Step 3: Post audience notification to Twitter (if enabled)
        let twitterPostSuccess = false;
        if (notifyAudience && isTwitterConnected) {
          try {
            console.log('📢 Posting audience notification...');
            const notificationResponse = await apiService.post(
              '/social/notify-audience',
              {
                capsule_id: capsuleData.capsule_id,
                reveal_date: revealDateTime.toISOString(),
                hint_text: `🔮 I just created an encrypted time capsule that will be revealed on`,
                include_capsule_link: true,
              }
            );

            if (notificationResponse.success) {
              console.log(
                '✅ Audience notification posted:',
                notificationResponse.data
              );
              twitterPostSuccess = true;
            } else {
              console.warn(
                '⚠️ Audience notification failed:',
                notificationResponse.error
              );
            }
          } catch (notificationError) {
            console.warn('⚠️ Audience notification error:', notificationError);
          }
        }

        // Show success message with platform-specific backup reminder
        let successMessage =
          '🎉 Time capsule created successfully and scheduled for automatic reveal';

        if (notifyAudience && isTwitterConnected) {
          if (twitterPostSuccess) {
            successMessage += '. Announcement posted to your audience!';
          } else {
            successMessage +=
              '. (Audience announcement failed - check Twitter connection)';
          }
        } else if (isTwitterConnected) {
          successMessage +=
            '. A reveal announcement will be posted to Twitter automatically.';
        } else {
          successMessage += '.';
        }

        if (isFirstTimeUser) {
          // Platform-specific backup recommendations
          const status = await CapsuleEncryptionService.getEncryptionStatus(
            walletAddress as string
          );
          if (status.platform === 'ios') {
            successMessage +=
              ' Remember to backup your encryption key in Profile settings.';
          } else {
            successMessage +=
              ' Your content is secured with Solana Mobile Seed Vault.';
          }
          setIsFirstTimeUser(false); // No longer first-time user
        }

        showSuccess(successMessage);

        // Reset form after short delay
        setTimeout(() => {
          setContent('');
          setRevealDateTime(new Date());
        }, 2000);
      } catch (dbError) {
        console.error('❌ Database save failed:', dbError);
        showError(
          '⚠️ Capsule created on blockchain but database save failed. Please contact support.'
        );

        setTimeout(() => {
          setContent('');
          setRevealDateTime(new Date());
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Error creating capsule:', error);

      // Check if this is a wallet connection error and we haven't already retried
      if (
        !isRetry &&
        error instanceof Error &&
        error.message.includes('wallet connection has expired')
      ) {
        // Attempt reconnection and retry
        const reconnectionSuccess = await attemptReconnectionAndRetry();
        if (reconnectionSuccess) {
          // Retry the operation
          return handleCreateCapsule(true);
        }
        // If reconnection failed, the error was already shown
        return;
      } else {
        showError(
          `Failed to create capsule: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuySOL = () => {
    setShowSOLModal(false);
    showInfo('SOL onramp feature coming soon!');
  };

  // Render hero content with gradient background
  const renderHeroContent = () => (
    <>
      <View style={styles.titleContainer}>
        <MaterialCommunityIcon
          name={
            createMode === 'time_capsule'
              ? 'package-variant-closed'
              : 'calendar-clock'
          }
          size={32}
          color={colors.primary}
          style={styles.titleIcon}
        />
        <Text style={styles.heroTitle}>
          {createMode === 'time_capsule' ? 'Create Capsule' : 'Schedule Post'}
        </Text>
      </View>
      <View style={styles.subtitleContainer}>
        <Text style={styles.heroSubtitle}>
          <Text style={styles.subtitleText}>
            {createMode === 'time_capsule'
              ? 'Encrypt your content for future reveal'
              : 'Schedule content for automatic posting'}
          </Text>
        </Text>
      </View>
      <View style={styles.heroStats}>
        <View style={styles.statItem}>
          <MaterialCommunityIcon
            name="wallet"
            size={28}
            color={colors.primary}
          />
          <Text style={styles.statValue}>{solBalance.balance.toFixed(4)}</Text>
          <Text style={styles.statLabel}>SOL Balance</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcon
            name={solBalance.sufficient ? 'check-circle' : 'alert-circle'}
            size={28}
            color={solBalance.sufficient ? colors.success : colors.warning}
          />
          <Text style={styles.statValue}>{solBalance.required.toFixed(4)}</Text>
          <Text style={styles.statLabel}>Required</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcon
            name={isGamified ? 'gamepad-variant' : 'lock'}
            size={28}
            color={colors.premiumOrange}
          />
          <Text style={styles.statValue}>{isGamified ? 'Game' : 'Secure'}</Text>
          <Text style={styles.statLabel}>Mode</Text>
        </View>
      </View>
    </>
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.screenContainer}>
        <View style={styles.centered}>
          <MaterialCommunityIcon
            name="wallet-outline"
            size={64}
            color={colors.primary}
            style={styles.connectIcon}
          />
          <Text variant="headlineSmall" style={styles.connectTitle}>
            Connect Your Wallet
          </Text>
          <Text variant="bodyMedium" style={styles.connectSubtitle}>
            You need to connect your wallet to create time capsules
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <ScrollView style={styles.scrollView}>
        {/* Modern Hero Section with Gradient Background */}
        <View style={styles.heroContainer}>
          <LinearGradient
            colors={[
              colors.surfaceVariant,
              Platform.OS === 'android'
                ? `rgba(29, 161, 242, 0.50)` // Much more visible on Android to match iOS
                : `rgba(29, 161, 242, 0.08)`, // Subtle on iOS
              colors.surfaceVariant,
            ]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={[
              styles.gradient,
              styles.gradientFix, // Force proper dimensions
              Platform.OS === 'android' && styles.androidGradientEnhancement,
            ]}
          >
            {renderHeroContent()}
          </LinearGradient>
        </View>

        {/* Mode Selection */}
        <Card style={styles.modeSelectionCard}>
          <Card.Content>
            <View style={styles.sectionTitleContainer}>
              <MaterialCommunityIcon
                name="pencil"
                size={20}
                color={colors.primary}
                style={styles.sectionIcon}
              />
              <Text style={styles.sectionTitle}>
                What do you want to create?
              </Text>
            </View>
            <View style={styles.modeButtonContainer}>
              <Pressable
                style={[
                  styles.modeButton,
                  createMode === 'time_capsule' && styles.modeButtonActive,
                ]}
                onPress={() => setCreateMode('time_capsule')}
              >
                <MaterialCommunityIcon
                  name="package-variant-closed"
                  size={24}
                  color={
                    createMode === 'time_capsule'
                      ? colors.primary
                      : colors.textSecondary
                  }
                  style={styles.modeIcon}
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    createMode === 'time_capsule' &&
                      styles.modeButtonTextActive,
                  ]}
                >
                  Time Capsule
                </Text>
                <Text style={styles.modeButtonDescription}>
                  Encrypted content stored on blockchain
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modeButton,
                  createMode === 'social_post' && styles.modeButtonActive,
                ]}
                onPress={() => setCreateMode('social_post')}
              >
                <MaterialCommunityIcon
                  name="calendar-clock"
                  size={24}
                  color={
                    createMode === 'social_post'
                      ? colors.primary
                      : colors.textSecondary
                  }
                  style={styles.modeIcon}
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    createMode === 'social_post' && styles.modeButtonTextActive,
                  ]}
                >
                  Social Post
                </Text>
                <Text style={styles.modeButtonDescription}>
                  Schedule a post to X
                </Text>
              </Pressable>
            </View>
          </Card.Content>
        </Card>

        {/* Unified Encryption Education Card - Show for first-time users (time capsule only) */}
        {createMode === 'time_capsule' && showVaultKeyInfo && (
          <Card style={styles.vaultKeyInfoCard}>
            <Card.Content>
              <View style={styles.vaultKeyHeader}>
                <Text style={styles.vaultKeyIcon}>
                  {Platform.OS === 'android' ? '🤖' : '📱'}
                </Text>
                <View style={styles.vaultKeyTextContainer}>
                  <Text style={styles.vaultKeyTitle}>
                    {Platform.OS === 'android'
                      ? 'Solana Mobile Seed Vault Setup'
                      : 'Device Encryption Setup'}
                  </Text>
                  <Text style={styles.vaultKeyDescription}>
                    {Platform.OS === 'android'
                      ? 'Your content will be encrypted using hardware-backed Solana Mobile Seed Vault for maximum security.'
                      : 'Your content will be encrypted on this device using secure key storage for protection.'}
                  </Text>
                  <Text style={styles.vaultKeyManagement}>
                    💡 You can manage your encryption settings in the Profile
                    screen.
                  </Text>
                </View>
                <Button
                  mode="text"
                  onPress={() => setShowVaultKeyInfo(false)}
                  style={styles.dismissButton}
                  compact
                >
                  Got It
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* SOL Balance Card (both modes require payment) */}
        <Card
          style={[
            styles.balanceCard,
            !solBalance.sufficient && styles.insufficientBalance,
          ]}
        >
          <Card.Content>
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>SOL Balance</Text>
              <Text style={styles.balanceAmount}>
                {solBalance.balance.toFixed(6)} SOL
              </Text>
            </View>
            <Text style={styles.balanceInfo}>
              {solBalance.sufficient
                ? createMode === 'time_capsule'
                  ? `✅ Sufficient balance for ${isGamified ? 'gamified ' : ''}capsule creation`
                  : '✅ Sufficient balance for social post scheduling'
                : `⚠️ Insufficient balance. You need at least ${solBalance.required.toFixed(6)} SOL`}
            </Text>
          </Card.Content>
        </Card>

        {/* Platform Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Platform</Text>
          <View style={styles.platformContainer}>
            {platforms.map(platform => (
              <Chip
                key={platform.key}
                mode={selectedPlatform === platform.key ? 'flat' : 'outlined'}
                selected={selectedPlatform === platform.key}
                onPress={() => setSelectedPlatform(platform.key as 'twitter' | 'farcaster')}
                style={styles.platformChip}
                icon={() => (
                  platform.customIcon ? (
                    <Image
                      source={platform.customIcon}
                      style={{
                        width: 16,
                        height: 16
                      }}
                    />
                  ) : (
                    <MaterialCommunityIcon
                      name={platform.icon as any}
                      size={16}
                      color={
                        selectedPlatform === platform.key
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                  )
                )}
              >
                <Text style={{ color: colors.text }}>{platform.label}</Text>
              </Chip>
            ))}
          </View>
        </View>

        {/* Gamification Toggle (time capsule only) */}
        {createMode === 'time_capsule' && (
          <View style={styles.section}>
            <View style={styles.gamificationHeader}>
              <View style={styles.gamificationTitleContainer}>
                <Text style={styles.sectionTitle}>🎮 Gamify This Capsule</Text>
                <Text style={styles.gamificationDescription}>
                  Let others guess your secret before it's revealed and compete
                  for points!
                </Text>
              </View>
              <Switch value={isGamified} onValueChange={setIsGamified} />
            </View>
            {isGamified && (
              <Card style={styles.gamificationInfoCard}>
                <Card.Content>
                  <Text style={styles.gamificationInfoText}>
                    🏆 When enabled, other users can submit guesses about your
                    capsule content. Winners earn points on the leaderboard when
                    your capsule is revealed!
                  </Text>
                </Card.Content>
              </Card>
            )}
          </View>
        )}

        {/* Content Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {createMode === 'time_capsule'
              ? 'Your Message'
              : 'Your Post Content'}
          </Text>
          <TextInput
            mode="outlined"
            placeholder={
              createMode === 'time_capsule'
                ? 'What would you like to share in the future?'
                : 'What do you want to post on X?'
            }
            value={content}
            textColor={colors.text}
            onChangeText={setContent}
            multiline
            numberOfLines={4}
            style={styles.contentInput}
          />
          <Text style={styles.characterCount}>
            {content.length}/280 characters
          </Text>
          {createMode === 'social_post' && (
            <View style={styles.hintContainer}>
              <MaterialCommunityIcon
                name="lightbulb-outline"
                size={14}
                color={colors.textSecondary}
                style={styles.hintIcon}
              />
              <Text style={styles.socialPostHint}>
                This content will be posted directly to X at your scheduled
                time. Service fee required.
              </Text>
            </View>
          )}
        </View>

        {/* Twitter Audience Notification Toggle (Time Capsule Mode Only) */}
        {createMode === 'time_capsule' && (
          <View style={styles.section}>
            <View style={styles.notificationHeader}>
              <View style={styles.notificationTitleContainer}>
                <Text style={styles.sectionTitle}>Notify Your Audience</Text>
                {!isTwitterConnected && (
                  <Text style={styles.twitterWarning}>
                    Connect X in Profile to enable notifications
                  </Text>
                )}
              </View>
              <Switch
                value={notifyAudience}
                onValueChange={setNotifyAudience}
                disabled={!isTwitterConnected}
              />
            </View>
            {notifyAudience && isTwitterConnected && (
              <Card style={styles.notificationInfoCard}>
                <Card.Content>
                  <Text style={styles.notificationInfoText}>
                    📢 This will post a teaser about your time capsule to your X
                    account, letting your followers know when to expect the
                    reveal.
                  </Text>
                </Card.Content>
              </Card>
            )}
          </View>
        )}

        {/* Reveal Date & Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>When to Reveal</Text>
          <Pressable
            onPress={openDateTimePicker}
            style={styles.dateTimeInputContainer}
          >
            <View style={styles.dateTimeInputWrapper}>
              <MaterialCommunityIcon
                name="calendar-clock"
                size={20}
                color={colors.primary}
                style={styles.dateTimeIcon}
              />
              <View style={styles.dateTimeTextContainer}>
                <Text style={styles.dateTimeLabel}>Selected Date & Time</Text>
                <Text style={styles.dateTimeValue}>
                  {revealDateTime.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  at{' '}
                  {revealDateTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <MaterialCommunityIcon
                name="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </View>
          </Pressable>
          <DateTimePickerModal
            visible={showDateTimePicker}
            initialDate={revealDateTime}
            onClose={() => setShowDateTimePicker(false)}
            onConfirm={date => {
              setRevealDateTime(date);
              setShowDateTimePicker(false);
            }}
          />
        </View>

        {/* Automatic Processing Info */}
        <Card style={styles.automaticRevealInfoCard}>
          <Card.Content>
            <Text style={styles.automaticRevealInfoText}>
              {createMode === 'time_capsule'
                ? "⏰ Your time capsule will be automatically revealed at the scheduled time. If you have X connected, we'll also post a reveal announcement to your followers."
                : '📱 Your post will be automatically published to X at the scheduled time. Make sure you have X connected in your Profile settings.'}
            </Text>
          </Card.Content>
        </Card>

        {/* Create Button */}
        <Button
          mode="contained"
          onPress={() => handleCreateCapsule()}
          loading={
            isLoading ||
            (createMode === 'time_capsule' && createCapsule.isPending)
          }
          disabled={
            isLoading ||
            (createMode === 'time_capsule' && createCapsule.isPending) ||
            !content.trim() ||
            !revealDateTime ||
            !solBalance.sufficient
          }
          style={styles.createButton}
        >
          {isLoading ||
          (createMode === 'time_capsule' && createCapsule.isPending)
            ? createMode === 'time_capsule'
              ? 'Creating Capsule...'
              : 'Scheduling Post...'
            : createMode === 'time_capsule'
              ? 'Create Time Capsule'
              : 'Schedule Post'}
        </Button>
      </ScrollView>
      {/* SOL Insufficient Modal */}
      <Portal>
        <Modal
          visible={showSOLModal}
          onDismiss={() => setShowSOLModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Insufficient SOL Balance</Text>
            <Text style={styles.modalDescription}>
              You need at least {solBalance.required} SOL to create a time
              capsule. Your current balance is {solBalance.balance.toFixed(6)}{' '}
              SOL.
            </Text>
            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowSOLModal(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleBuySOL}
                style={styles.modalButton}
              >
                Buy SOL
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>
      {/* Guided Tour for CreateCapsuleScreen */}
      <TourGuide
        visible={showTour}
        onComplete={() => setShowTour(false)}
        tourId="create_capsule_screen_tour"
        steps={createCapsuleTourSteps}
      />
      {/* Snackbar for notifications */}
      <AppSnackbar
        visible={snackbar.visible}
        message={snackbar.message}
        type={snackbar.type}
        onDismiss={hideSnackbar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    ...layout.screenContainer,
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    ...layout.centered,
    padding: spacing.sectionPadding,
  },
  connectIcon: {
    marginBottom: spacing.lg,
  },
  connectTitle: {
    ...typography.headlineSmall,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  connectSubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Modern Hero Section (from HubScreen pattern)
  heroContainer: {
    borderRadius: 20,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.screenPadding,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  titleIcon: {
    marginRight: spacing.sm,
  },
  heroTitle: {
    ...typography.displayMedium,
    color: colors.text,
    fontWeight: 'bold',
    textShadowColor: colors.primary + '20',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitleContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  heroSubtitle: {
    textAlign: 'center',
    lineHeight: 24,
  },
  subtitleText: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  statValue: {
    ...typography.headlineMedium,
    color: colors.text,
  },
  statLabel: {
    ...typography.labelMedium,
    color: colors.textSecondary,
  },
  // Fix for LinearGradient rendering issues
  gradientFix: {
    flex: 1,
    width: '100%',
    minHeight: 200,
  },
  // Android gradient enhancement
  androidGradientEnhancement: {
    borderWidth: 1,
    borderColor: colors.primary + '30',
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    backgroundColor: 'rgba(29, 161, 242, 0.02)',
  },
  balanceCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  insufficientBalance: {
    borderColor: colors.error,
    borderWidth: 2,
    backgroundColor: colors.surfaceVariant,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  balanceLabel: {
    // New style for the SOL Balance text
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: 'bold',
  },
  balanceAmount: {
    ...typography.titleMedium,
    color: colors.primary,
    fontWeight: 'bold',
  },
  balanceInfo: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionIcon: {
    marginRight: spacing.sm,
  },
  sectionTitle: {
    ...typography.titleMedium,
    color: colors.text,
    fontWeight: 'bold',
  },
  platformContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  platformChip: {
    marginRight: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.border
  },
  contentInput: {
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  characterCount: {
    ...typography.bodySmall,
    textAlign: 'right',
    color: colors.textSecondary,
  },
  dateTimeInputContainer: {
    marginTop: spacing.sm,
  },
  dateTimeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 60,
  },
  dateTimeIcon: {
    marginRight: spacing.md,
  },
  dateTimeTextContainer: {
    flex: 1,
  },
  dateTimeLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  dateTimeValue: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '500',
  },
  dateInput: {
    flex: 2,
  },
  timeInput: {
    flex: 1,
  },
  createButton: {
    ...components.primaryButton,
    marginHorizontal: spacing.md,
    marginVertical: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: 16,
    padding: spacing.lg,
    ...shadows.medium,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalContent: {
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.headlineSmall,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalDescription: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  modalButton: {
    flex: 1,
  },
  // Card Styles with Modern Theming
  modeSelectionCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  modeButtonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modeButton: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeButtonActive: {
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.primary,
  },
  modeIcon: {
    marginBottom: spacing.sm,
  },
  modeButtonText: {
    ...typography.titleSmall,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: colors.primary,
  },
  modeButtonDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Info Card Styles
  vaultKeyInfoCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  vaultKeyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  vaultKeyIcon: {
    fontSize: 24,
    marginRight: spacing.md,
    marginTop: 2,
  },
  vaultKeyTextContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  vaultKeyTitle: {
    ...typography.titleMedium,
    color: colors.primary,
    marginBottom: spacing.xs,
    fontWeight: 'bold',
  },
  vaultKeyDescription: {
    ...typography.bodyMedium,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  vaultKeyManagement: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  dismissButton: {
    alignSelf: 'flex-start',
  },
  // Notification and Info Styles
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  notificationTitleContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  twitterWarning: {
    ...typography.bodySmall,
    color: colors.error,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  notificationInfoCard: {
    backgroundColor: colors.surfaceVariant,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  notificationInfoText: {
    ...typography.bodyMedium,
    color: colors.success,
    lineHeight: 22,
  },

  // Gamification Styles
  gamificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  gamificationTitleContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  gamificationDescription: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 22,
  },
  gamificationInfoCard: {
    backgroundColor: colors.surfaceVariant,
    borderLeftWidth: 4,
    borderLeftColor: colors.premiumOrange,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  gamificationInfoText: {
    ...typography.bodyMedium,
    color: colors.premiumOrange,
    lineHeight: 22,
  },
  automaticRevealInfoCard: {
    backgroundColor: colors.surfaceVariant,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  automaticRevealInfoText: {
    ...typography.bodyMedium,
    color: colors.primary,
    lineHeight: 22,
  },

  // New Icon and Text Container Styles
  infoTextContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  hintIcon: {
    marginRight: spacing.sm,
  },
  socialPostHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },
});
