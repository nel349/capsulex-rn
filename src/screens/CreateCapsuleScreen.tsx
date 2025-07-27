import * as anchor from '@coral-xyz/anchor';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import type { Address } from '@solana/kit';
import * as Crypto from 'expo-crypto';
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Platform,
  Pressable,
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

import { AppSnackbar } from '../components/ui/AppSnackbar';
import { useAuth } from '../contexts';
import { useSnackbar } from '../hooks/useSnackbar';
import { apiService } from '../services/api';
import { useCapsuleService } from '../services/capsuleService';
import { useSolanaService } from '../services/solana';
import { twitterService } from '../services/twitterService';
import { useCapsulexProgram } from '../solana/useCapsulexProgram';
import { VaultKeyManager } from '../utils/vaultKey';

interface SOLBalance {
  balance: number;
  sufficient: boolean;
  required: number;
}

type CreateMode = 'time_capsule' | 'social_post';

export function CreateCapsuleScreen() {
  const { isAuthenticated, walletAddress, reconnectWallet } = useAuth();
  const { createCapsule } = useCapsulexProgram();
  const { createCapsule: createCapsuleInDB } = useCapsuleService();
  
  // Mode selection
  const [createMode, setCreateMode] = useState<CreateMode>('time_capsule');
  
  const [content, setContent] = useState('something:for testing');
  const [selectedPlatform, setSelectedPlatform] = useState<
    'twitter' | 'instagram'
  >('twitter');
  const [revealDateTime, setRevealDateTime] = useState(new Date()); // Combined Date and Time
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSOLModal, setShowSOLModal] = useState(false);
  const [solBalance, setSolBalance] = useState<SOLBalance>({
    balance: 0,
    sufficient: true,
    required: 0.00005,
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
    { key: 'twitter', label: 'Twitter', icon: '🐦' },
    { key: 'instagram', label: 'Instagram', icon: '📷' },
  ];

  useEffect(() => {
    checkSOLBalance();
  }, [getBalance, walletAddress, createMode, isGamified]);

  // Check if user is creating their first capsule (no vault key yet)
  const checkFirstTimeUser = async () => {
    if (!walletAddress) return;

    try {
      const hasVaultKey = await VaultKeyManager.hasVaultKey(walletAddress);
      setIsFirstTimeUser(!hasVaultKey);
      setShowVaultKeyInfo(!hasVaultKey); // Show info card for first-time users
    } catch (error) {
      console.error('Failed to check vault key status:', error);
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
    
    // Calculate required SOL based on mode and features (pay-per-use pricing)
    let required: number;
    if (createMode === 'social_post') {
      // Social posts: Just Twitter scheduling (~$0.25 = ~0.00125 SOL at $200/SOL)
      required = 0.00125;
    } else if (isGamified) {
      // Gamified time capsules: Everything + AI gaming (~$0.50 = ~0.0025 SOL)
      // Blockchain + encryption + reveal posting + AI semantic validation + gaming
      required = 0.0025;
    } else {
      // Regular time capsules: Blockchain + encryption + reveal posting (~$0.35 = ~0.00175 SOL)
      // Same infrastructure as gamified, just no AI gaming layer
      required = 0.00175;
    }

    setSolBalance({
      balance: balance,
      sufficient: balance >= required,
      required,
    });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || revealDateTime;
    setShowDatePicker(Platform.OS === 'ios');
    setRevealDateTime(currentDate);
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    const currentTime = selectedTime || revealDateTime;
    setShowTimePicker(Platform.OS === 'ios');
    setRevealDateTime(currentTime);
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const showTimepicker = () => {
    setShowTimePicker(true);
  };

  const attemptReconnectionAndRetry = async (
    originalError: Error
  ): Promise<boolean> => {
    try {
      showInfo('Attempting to reconnect your wallet...');
      const reconnectionSuccess = await reconnectWallet();

      if (reconnectionSuccess) {
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

  const handleCreateSocialPost = async (isRetry: boolean = false) => {
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
      showError(createMode === 'time_capsule' ? 'Please enter content for your capsule' : 'Please enter content for your post');
      return;
    }

    if (!revealDateTime) {
      showError(createMode === 'time_capsule' ? 'Please select a reveal date and time' : 'Please select when to post');
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
      return handleCreateSocialPost(isRetry);
    }

    try {
      // Convert to Unix timestamp (seconds) and then to Anchor BN
      const revealDateBN = new anchor.BN(
        Math.floor(revealDateTime.getTime() / 1000)
      );

      const contentStorage = { text: {} };
      const contentHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        content
      );

      // console.log('🐛 Debug info before createCapsule:');
      // console.log('- createCapsule object:', createCapsule);
      // console.log('- createCapsule.mutateAsync:', createCapsule?.mutateAsync);
      // console.log('- selectedAccount:', selectedAccount);

      // Step 1: Encrypt content using device vault key (no wallet signing required!)
      showInfo('Encrypting your content with your device vault key...');

      let encryptedContent;
      try {
        encryptedContent = await VaultKeyManager.encryptContent(
          content,
          walletAddress as string
        );
        console.log('🔐 Content encrypted with device vault key');
      } catch (encryptionError) {
        console.error('❌ Vault encryption failed:', encryptionError);
        showError(
          'Failed to encrypt content with vault key. Please try again.'
        );
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
        contentIntegrityHash: contentHash,
        revealDate: revealDateBN,
        isGamified: isGamified,
      });

      console.log('✅ Capsule created on-chain:', txResult);

      // Step 3: Save capsule to Supabase database
      try {
        const currentTime = new Date().toISOString(); // Capture frontend time for consistency
        const capsuleData = await createCapsuleInDB({
          content_encrypted: JSON.stringify(encryptedContent), // Store wallet-encrypted content with metadata
          content_hash: contentHash,
          has_media: false,
          media_urls: [],
          reveal_date: revealDateTime.toISOString(),
          created_at: currentTime, // Use frontend time to ensure consistency with reveal_date
          on_chain_tx:
            typeof txResult === 'string'
              ? txResult
              : (txResult as any)?.signature || JSON.stringify(txResult),
          sol_fee_amount: solBalance.required,
          is_gamified: isGamified,
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

        // Show success message with backup reminder for first-time users
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
          successMessage +=
            ' Remember to backup your encryption key in Profile settings.';
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
        const reconnectionSuccess = await attemptReconnectionAndRetry(error);
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

  if (!isAuthenticated) {
    return (
      <View style={styles.screenContainer}>
        <View style={styles.connectPrompt}>
          <Text style={styles.title}>Connect Your Wallet</Text>
          <Text style={styles.subtitle}>
            You need to connect your wallet to create time capsules
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {createMode === 'time_capsule' ? 'Create Time Capsule' : 'Schedule Social Post'}
          </Text>
          <Text style={styles.subtitle}>
            {createMode === 'time_capsule' 
              ? 'Schedule your content for future reveal'
              : 'Schedule a post to be published automatically'
            }
          </Text>
        </View>

        {/* Mode Selection */}
        <Card style={styles.modeSelectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>📝 What do you want to create?</Text>
            <View style={styles.modeButtonContainer}>
              <Pressable
                style={[
                  styles.modeButton,
                  createMode === 'time_capsule' && styles.modeButtonActive,
                ]}
                onPress={() => setCreateMode('time_capsule')}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    createMode === 'time_capsule' && styles.modeButtonTextActive,
                  ]}
                >
                  🔐 Time Capsule
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
                <Text
                  style={[
                    styles.modeButtonText,
                    createMode === 'social_post' && styles.modeButtonTextActive,
                  ]}
                >
                  📱 Social Post
                </Text>
                <Text style={styles.modeButtonDescription}>
                  Schedule a post to Twitter
                </Text>
              </Pressable>
            </View>
          </Card.Content>
        </Card>

        {/* Vault Key Education Card - Show for first-time users (time capsule only) */}
        {createMode === 'time_capsule' && showVaultKeyInfo && (
          <Card style={styles.vaultKeyInfoCard}>
            <Card.Content>
              <View style={styles.vaultKeyHeader}>
                <Text style={styles.vaultKeyIcon}>🔐</Text>
                <View style={styles.vaultKeyTextContainer}>
                  <Text style={styles.vaultKeyTitle}>
                    Device Encryption Setup
                  </Text>
                  <Text style={styles.vaultKeyDescription}>
                    Your content will be encrypted on this device for security.
                    This requires one wallet signature to set up encryption.
                  </Text>
                  <Text style={styles.vaultKeyManagement}>
                    💡 You can manage your encryption key in the Profile screen.
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
            <Text>SOL Balance</Text>
            <Text style={styles.balanceAmount}>
              {solBalance.balance.toFixed(6)} SOL
            </Text>
          </View>
          <Text style={styles.balanceInfo}>
            {solBalance.sufficient
              ? (createMode === 'time_capsule' 
                  ? `✅ Sufficient balance for ${isGamified ? 'gamified ' : ''}capsule creation`
                  : '✅ Sufficient balance for social post scheduling')
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
                onPress={() =>
                  setSelectedPlatform(platform.key as 'twitter' | 'instagram')
                }
                style={styles.platformChip}
              >
                {platform.icon} {platform.label}
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
            {createMode === 'time_capsule' ? 'Your Message' : 'Your Post Content'}
          </Text>
          <TextInput
            mode="outlined"
            placeholder={createMode === 'time_capsule' 
              ? "What would you like to share in the future?" 
              : "What do you want to post on Twitter?"
            }
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={4}
            style={styles.contentInput}
          />
          <Text style={styles.characterCount}>
            {content.length}/280 characters
          </Text>
          {createMode === 'social_post' && (
            <Text style={styles.socialPostHint}>
              💡 This content will be posted directly to Twitter at your scheduled time. Service fee required.
            </Text>
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
                    Connect Twitter in Profile to enable notifications
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
                    📢 This will post a teaser about your time capsule to your
                    Twitter account, letting your followers know when to expect
                    the reveal.
                  </Text>
                </Card.Content>
              </Card>
            )}
          </View>
        )}

        {/* Reveal Date & Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>When to Reveal</Text>
          <View style={styles.dateTimeContainer}>
            <Pressable onPress={showDatepicker} style={styles.dateInput}>
              <TextInput
                mode="outlined"
                label="Date"
                value={revealDateTime.toLocaleDateString()}
                editable={false}
                pointerEvents="none"
              />
            </Pressable>
            <Pressable onPress={showTimepicker} style={styles.timeInput}>
              <TextInput
                mode="outlined"
                label="Time"
                value={revealDateTime.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                editable={false}
                pointerEvents="none"
              />
            </Pressable>
          </View>
          {showDatePicker && (
            <DateTimePicker
              testID="datePicker"
              value={revealDateTime}
              mode="date"
              is24Hour={true}
              display="default"
              onChange={onDateChange}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              testID="timePicker"
              value={revealDateTime}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={onTimeChange}
            />
          )}
        </View>

        {/* Automatic Processing Info */}
        <Card style={styles.automaticRevealInfoCard}>
          <Card.Content>
            <Text style={styles.automaticRevealInfoText}>
              {createMode === 'time_capsule' 
                ? '⏰ Your time capsule will be automatically revealed at the scheduled time. If you have Twitter connected, we\'ll also post a reveal announcement to your followers.'
                : '📱 Your post will be automatically published to Twitter at the scheduled time. Make sure you have Twitter connected in your Profile settings.'
              }
            </Text>
          </Card.Content>
        </Card>


        {/* Create Button */}
        <Button
          mode="contained"
          onPress={() => handleCreateCapsule()}
          loading={isLoading || (createMode === 'time_capsule' && createCapsule.isPending)}
          disabled={
            isLoading ||
            (createMode === 'time_capsule' && createCapsule.isPending) ||
            !content.trim() ||
            !revealDateTime ||
            !solBalance.sufficient
          }
          style={styles.createButton}
        >
          {isLoading || (createMode === 'time_capsule' && createCapsule.isPending)
            ? (createMode === 'time_capsule' ? 'Creating Capsule...' : 'Scheduling Post...')
            : (createMode === 'time_capsule' ? 'Create Time Capsule' : 'Schedule Post')}
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
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
  },
  connectPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  balanceCard: {
    margin: 16,
    marginBottom: 8,
  },
  insufficientBalance: {
    borderColor: '#FF5722',
    borderWidth: 1,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  balanceAmount: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  balanceInfo: {
    color: '#666',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  platformContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  platformChip: {
    marginRight: 8,
  },
  contentInput: {
    marginBottom: 8,
  },
  characterCount: {
    textAlign: 'right',
    color: '#666',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 2,
  },
  timeInput: {
    flex: 1,
  },
  createButton: {
    margin: 16,
    marginTop: 8,
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    padding: 20,
  },
  modalContent: {
    alignItems: 'center',
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  modalDescription: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
  // Vault Key Education Card Styles
  vaultKeyInfoCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#E3F2FD', // Light blue background
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3', // Blue accent
  },
  vaultKeyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  vaultKeyIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  vaultKeyTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  vaultKeyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 4,
  },
  vaultKeyDescription: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
    marginBottom: 8,
  },
  vaultKeyManagement: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  dismissButton: {
    alignSelf: 'flex-start',
  },
  // Twitter Notification Styles
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notificationTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  twitterWarning: {
    fontSize: 12,
    color: '#FF5722',
    marginTop: 4,
    fontStyle: 'italic',
  },
  notificationInfoCard: {
    backgroundColor: '#E8F5E8',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  notificationInfoText: {
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
  // Gamification Styles
  gamificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  gamificationTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  gamificationDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    lineHeight: 20,
  },
  gamificationInfoCard: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  gamificationInfoText: {
    fontSize: 14,
    color: '#E65100',
    lineHeight: 20,
  },
  automaticRevealInfoCard: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    margin: 16,
    marginTop: 8,
  },
  automaticRevealInfoText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
  modeSelectionCard: {
    margin: 16,
    marginBottom: 8,
  },
  modeButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  modeButtonTextActive: {
    color: '#1565C0',
  },
  modeButtonDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  socialPostHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
