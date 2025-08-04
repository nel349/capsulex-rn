import * as anchor from '@coral-xyz/anchor';
import MaterialCommunityIcon from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import type { Address } from '@solana/kit';
import * as Crypto from 'expo-crypto';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Platform as RNPlatform } from 'react-native';
import { Text, Button, Portal, Modal } from 'react-native-paper';

// Components
import type {
  CreateMode,
  Platform,
} from '../components/create-capsule';
import {
  StepCard,
  ModeSelectionStep,
  PlatformSelectionStep,
  ContentInputStep,
  TimingSettingsStep,
} from '../components/create-capsule';
import DateTimePickerModal from '../components/DateTimePickerModal';
import { AppSnackbar } from '../components/ui/AppSnackbar';

// Hooks
import { useStepManager } from '../hooks/useStepManager';
import { useDualAuth } from '../providers';
import { useBalance } from '../services/solana';
import { useCapsulexProgram } from '../solana/useCapsulexProgram';
import { useCapsuleService } from '../services/capsuleService';
import { useSnackbar } from '../hooks/useSnackbar';
import { apiService } from '../services/api';
import { CapsuleEncryptionService } from '../services/capsuleEncryptionService';
import { twitterService } from '../services/twitterService';

// Styles
import { colors, spacing, typography, shadows } from '../theme';

// Types
interface SOLBalance {
  balance: number;
  sufficient: boolean;
  required: number;
}

export const CreateCapsuleScreenNew: React.FC = () => {
  // Step management
  const {
    currentStep,
    completedSteps,
    completeStep,
    goToStep,
    isStepCompleted,
    isStepCurrent,
    isStepAccessible,
    resetSteps,
  } = useStepManager(5);

  // Form state
  const [createMode, setCreateMode] = useState<CreateMode>('time_capsule');
  const [selectedPlatform, setSelectedPlatform] =
    useState<Platform>('twitter');
  const [content, setContent] = useState('');
  const [isGamified, setIsGamified] = useState(false);
  const [revealDateTime, setRevealDateTime] = useState(() => {
    const oneHourFromNow = new Date();
    oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);
    return oneHourFromNow;
  });
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [showSOLModal, setShowSOLModal] = useState(false);
  const [showVaultKeyInfo, setShowVaultKeyInfo] = useState(false);
  
  // User state
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [notifyAudience, setNotifyAudience] = useState(false);
  const [isTwitterConnected, setIsTwitterConnected] = useState(false);

  // Services
  const { isAuthenticated, walletAddress } = useDualAuth();
  const { createCapsule } = useCapsulexProgram();
  const { createCapsule: createCapsuleInDB } = useCapsuleService();
  const { snackbar, showError, showSuccess, showInfo, hideSnackbar } = useSnackbar();

  // SOL Balance using React Query
  const { data: balance } = useBalance(walletAddress as unknown as Address);

  // Calculate SOL balance with requirements
  const solBalance: SOLBalance = useMemo(() => {
    const currentBalance = balance || 0;
    const required = createMode === 'time_capsule' ? 0.0014 : 0.0014; // Updated V1 pricing: ~$0.25 at $180/SOL

    return {
      balance: currentBalance,
      sufficient: currentBalance >= required,
      required,
    };
  }, [balance, createMode]);

  // Check first-time user status
  const checkFirstTimeUser = useCallback(async () => {
    if (!walletAddress) return;

    try {
      const isAvailable = await CapsuleEncryptionService.isEncryptionAvailable();
      const status = await CapsuleEncryptionService.getEncryptionStatus(walletAddress);

      const isFirstTime =
        !isAvailable ||
        (status.platform === 'ios' && !status.details.hasVaultKey) ||
        (status.platform === 'android' && status.details.authorizedSeeds === 0);

      setIsFirstTimeUser(isFirstTime);
      setShowVaultKeyInfo(isFirstTime);
    } catch (error) {
      console.error('Failed to check encryption status:', error);
      setIsFirstTimeUser(true);
    }
  }, [walletAddress]);

  // Check Twitter connection
  const checkTwitterConnection = useCallback(async () => {
    try {
      const connected = await twitterService.isTwitterConnected();
      setIsTwitterConnected(connected);
    } catch (error) {
      console.error('Failed to check Twitter connection:', error);
      setIsTwitterConnected(false);
    }
  }, []);

  // Effects
  useEffect(() => {
    checkFirstTimeUser();
    checkTwitterConnection();
  }, [checkFirstTimeUser, checkTwitterConnection]);

  useFocusEffect(
    useCallback(() => {
      checkFirstTimeUser();
      checkTwitterConnection();
    }, [checkFirstTimeUser, checkTwitterConnection])
  );

  // Step handlers
  const handleModeSelection = (mode: CreateMode) => {
    setCreateMode(mode);
  };

  const handlePlatformSelection = (platform: Platform) => {
    console.log('Platform handler called:', platform);
    setSelectedPlatform(platform);
  };

  const handleContentChange = (text: string) => {
    setContent(text);
  };

  const handleGamificationChange = (enabled: boolean) => {
    setIsGamified(enabled);
  };

  const handleDateTimePress = () => {
    setShowDateTimePicker(true);
  };

  const handleDateTimeConfirm = (date: Date) => {
    setRevealDateTime(date);
    setShowDateTimePicker(false);
  };

  // Social post creation
  const handleCreateSocialPost = async () => {
    try {
      console.log('📱 Creating social post...');

      const response = await apiService.post('/scheduler/social-post', {
        post_content: content,
        scheduled_for: revealDateTime.toISOString(),
      });

      if (response.success) {
        console.log('✅ Social post scheduled:', response.data);
        showSuccess(
          `📱 Social post scheduled successfully! It will be posted on ${revealDateTime.toLocaleDateString()} at ${revealDateTime.toLocaleTimeString()}.`
        );

        setTimeout(() => {
          resetForm();
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

    // Validate reveal date is at least 1 second in the future and within 1 year (required by Solana program)
    const now = new Date();
    const oneSecondFromNow = new Date(now.getTime() + 1000);
    const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    
    if (revealDateTime <= oneSecondFromNow) {
      showError(
        createMode === 'time_capsule'
          ? 'Reveal date must be in the future'
          : 'Post date must be in the future'
      );
      return;
    }
    
    if (revealDateTime > oneYearFromNow) {
      showError(
        createMode === 'time_capsule'
          ? 'Reveal date cannot be more than 1 year in the future'
          : 'Post date cannot be more than 1 year in the future'
      );
      return;
    }

    if (!isAuthenticated) {
      showError('Please connect your wallet first');
      return;
    }

    if (!solBalance.sufficient) {
      setShowSOLModal(true);
      return;
    }

    setIsLoading(true);

    if (createMode === 'social_post') {
      return handleCreateSocialPost();
    }

    try {
      const revealDateBN = new anchor.BN(
        Math.floor(revealDateTime.getTime() / 1000)
      );

      const contentStorage = { text: {} };

      showInfo('Initializing encryption system...');

      try {
        await CapsuleEncryptionService.initialize(walletAddress as string);
        console.log('✅ Unified encryption initialized');
      } catch (initError) {
        console.error('❌ Encryption initialization failed:', initError);
        showError('Failed to initialize encryption system. Please try again.');
        return;
      }

      showInfo('Encrypting your content securely...');

      let encryptionResult;
      try {
        encryptionResult = await CapsuleEncryptionService.encryptContent(
          content,
          walletAddress as string
        );
        console.log('🔐 Content encrypted (content only)');
        console.log('🔐 Encryption result:', JSON.stringify(encryptionResult, null, 2));
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

      const blockchainPlaceholder = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `ENCRYPTED_CONTENT_${walletAddress}_${Date.now()}`
      );

      // What are we sending to the blockchain?
      console.log('🔐 Encrypted content:', blockchainPlaceholder);
      console.log('🔐 Content storage:', contentStorage);
      console.log('🔐 Content integrity hash:', encryptionResult.content_hash.toString());
      console.log('🔐 Reveal date:', revealDateBN.toString());
      console.log('🔐 Is gamified:', isGamified);

      const txResult = await createCapsule.mutateAsync({
        encryptedContent: blockchainPlaceholder,
        contentStorage: contentStorage,
        contentIntegrityHash: encryptionResult.content_hash,
        revealDate: revealDateBN,
        isGamified: isGamified,
      });

      console.log('✅ Capsule created on-chain:', txResult);

      try {
        const capsuleData = await createCapsuleInDB({
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
          ...encryptionResult,
        });

        console.log('✅ Capsule saved to database:', capsuleData);

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
          setIsFirstTimeUser(false);
        }

        showSuccess(successMessage);

        setTimeout(() => {
          resetForm();
        }, 2000);
      } catch (dbError) {
        console.error('❌ Database save failed:', dbError);
        showError(
          '⚠️ Capsule created on blockchain but database save failed. Please contact support.'
        );

        setTimeout(() => {
          resetForm();
        }, 3000);
      }
    } catch (error) {
      console.warn('❌ Error creating capsule:', error);
      showError(
        `Failed to create capsule: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuySOL = () => {
    setShowSOLModal(false);
    showInfo('SOL onramp feature coming soon!');
  };

  // Reset form after successful creation
  const resetForm = () => {
    setContent('');
    const oneHourFromNow = new Date();
    oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);
    setRevealDateTime(oneHourFromNow);
    setCreateMode('time_capsule');
    setSelectedPlatform('twitter');
    setIsGamified(false);
    resetSteps();
  };

  // Helper functions
  const getModeLabel = (mode: CreateMode) => {
    return mode === 'time_capsule' ? 'Time Capsule' : 'Social Post';
  };

  const getPlatformLabel = (platform: Platform) => {
    return platform === 'twitter' ? 'X' : 'Farcaster';
  };

  const renderHeroSection = () => (
    <View style={styles.heroContainer}>
      <LinearGradient
        colors={[
          colors.surfaceVariant,
          RNPlatform.OS === 'android'
            ? `rgba(29, 161, 242, 0.50)`
            : `rgba(29, 161, 242, 0.08)`,
          colors.surfaceVariant,
        ]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.titleContainer}>
          <MaterialCommunityIcon
            name="rocket-launch"
            size={32}
            color={colors.primary}
            style={styles.titleIcon}
          />
          <Text style={styles.heroTitle}>Create</Text>
        </View>
        <View style={styles.subtitleContainer}>
          <Text style={[styles.heroSubtitle, typography.bodyLarge]}>
            Transform your content into encrypted time capsules or schedule
            social posts
          </Text>
        </View>
      </LinearGradient>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text>Please connect your wallet to continue</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {renderHeroSection()}

        {/* Step 1: Mode Selection */}
        <StepCard
          stepNumber={1}
          title="Choose Creation Mode"
          summary={isStepCompleted(1) ? getModeLabel(createMode) : undefined}
          isCompleted={isStepCompleted(1)}
          isCurrent={isStepCurrent(1)}
          isAccessible={isStepAccessible(1)}
          onStepPress={() => goToStep(1)}
        >
          <ModeSelectionStep
            createMode={createMode}
            onModeChange={handleModeSelection}
            onContinue={() => completeStep(1)}
          />
        </StepCard>

        {/* Step 2: Platform Selection */}
        <StepCard
          stepNumber={2}
          title="Choose Platform"
          summary={
            isStepCompleted(2) ? getPlatformLabel(selectedPlatform) : undefined
          }
          isCompleted={isStepCompleted(2)}
          isCurrent={isStepCurrent(2)}
          isAccessible={isStepAccessible(2)}
          onStepPress={() => goToStep(2)}
        >
          <PlatformSelectionStep
            selectedPlatform={selectedPlatform}
            onPlatformChange={handlePlatformSelection}
            onContinue={() => completeStep(2)}
          />
        </StepCard>

        {/* Step 3: Content Input */}
        <StepCard
          stepNumber={3}
          title="Create Content"
          summary={
            isStepCompleted(3) ? `${content.length} characters` : undefined
          }
          isCompleted={isStepCompleted(3)}
          isCurrent={isStepCurrent(3)}
          isAccessible={isStepAccessible(3)}
          onStepPress={() => goToStep(3)}
        >
          <ContentInputStep
            content={content}
            onContentChange={handleContentChange}
            createMode={createMode}
            isGamified={isGamified}
            onGamificationChange={handleGamificationChange}
            onContinue={() => completeStep(3)}
          />
        </StepCard>

        {/* Step 4: Timing Settings */}
        <StepCard
          stepNumber={4}
          title="Set Timing"
          summary={
            isStepCompleted(4) ? revealDateTime.toLocaleDateString() : undefined
          }
          isCompleted={isStepCompleted(4)}
          isCurrent={isStepCurrent(4)}
          isAccessible={isStepAccessible(4)}
          onStepPress={() => goToStep(4)}
        >
          <TimingSettingsStep
            createMode={createMode}
            revealDateTime={revealDateTime}
            onDateTimePress={handleDateTimePress}
            solBalance={solBalance}
            isGamified={isGamified}
            onContinue={() => completeStep(4)}
          />
        </StepCard>

        {/* Step 5: Review & Create */}
        <StepCard
          stepNumber={5}
          title="Review & Create"
          isCompleted={isStepCompleted(5)}
          isCurrent={isStepCurrent(5)}
          isAccessible={isStepAccessible(5)}
        >
          <View style={styles.reviewSection}>
            <Text style={styles.reviewTitle}>
              Review Your {getModeLabel(createMode)}
            </Text>
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Platform:</Text>
              <Text style={styles.reviewValue}>
                {getPlatformLabel(selectedPlatform)}
              </Text>
            </View>
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Content:</Text>
              <Text style={styles.reviewValue} numberOfLines={2}>
                {content || 'No content'}
              </Text>
            </View>
            {createMode === 'time_capsule' && (
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Gamified:</Text>
                <Text style={styles.reviewValue}>
                  {isGamified ? 'Yes' : 'No'}
                </Text>
              </View>
            )}
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Scheduled for:</Text>
              <Text style={styles.reviewValue}>
                {revealDateTime.toLocaleString()}
              </Text>
            </View>
            <Button
              mode="contained"
              onPress={() => handleCreateCapsule()}
              style={styles.createButton}
              disabled={!solBalance.sufficient || !content.trim()}
            >
              {createMode === 'time_capsule' ? 'Create Time Capsule' : 'Schedule Post'}
            </Button>
          </View>
        </StepCard>
      </ScrollView>

      {/* Date Time Picker Modal */}
      <DateTimePickerModal
        visible={showDateTimePicker}
        initialDate={revealDateTime}
        onClose={() => setShowDateTimePicker(false)}
        onConfirm={handleDateTimeConfirm}
      />

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
              You need at least {solBalance.required} SOL to create a{' '}
              {createMode === 'time_capsule' ? 'time capsule' : 'social post'}.
              Your current balance is {solBalance.balance.toFixed(6)} SOL.
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

      {/* Snackbar */}
      <AppSnackbar {...snackbar} onDismiss={hideSnackbar} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
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
  },
  subtitleContainer: {
    alignItems: 'center',
  },
  heroSubtitle: {
    textAlign: 'center',
    color: colors.textSecondary,
    lineHeight: 24,
  },
  reviewSection: {
    marginTop: spacing.md,
  },
  reviewTitle: {
    ...typography.titleMedium,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  reviewLabel: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    flex: 1,
  },
  reviewValue: {
    ...typography.bodyMedium,
    color: colors.text,
    flex: 2,
    textAlign: 'right',
  },
  createButton: {
    marginTop: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: 20,
    padding: spacing.lg,
    ...shadows.large,
  },
  modalContent: {
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.headlineSmall,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalDescription: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  modalButton: {
    flex: 1,
  },
});
