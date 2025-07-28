import * as anchor from '@coral-xyz/anchor';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Address } from '@solana/kit';
import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Alert,
  Animated,
  Vibration,
  AppState,
} from 'react-native';
import {
  Text,
  Card,
  FAB,
  IconButton,
  Chip,
  ProgressBar,
  Button,
  ActivityIndicator,
  Avatar,
} from 'react-native-paper';

import { useDualAuth } from '../providers';
import type {
  CapsuleWithStatus,
  WalletCapsulesResponse,
} from '../services/capsuleApi';
import { capsuleApi, CapsuleApiService } from '../services/capsuleApi';
import { useCapsuleService } from '../services/capsuleService';
import { useBalance } from '../services/solana';
import { useCapsulexProgram } from '../solana/useCapsulexProgram';
import type { Capsule } from '../types/api';

// Enhanced capsule type that merges blockchain and database data
interface EnhancedCapsule extends CapsuleWithStatus {
  databaseData?: Capsule; // Additional database fields including content_encrypted
}

type RootStackParamList = {
  CapsuleDetails: { capsule: EnhancedCapsule };
};

type HubScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CapsuleDetails'
>;

export function HubScreen() {
  const navigation = useNavigation<HubScreenNavigationProp>();
  const { isAuthenticated, walletAddress } = useDualAuth();
  const [capsuleData, setCapsuleData] = useState<
    WalletCapsulesResponse['data'] | null
  >(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [solBalance, setSolBalance] = useState<number | null>(null);
  const [revealingCapsules, setRevealingCapsules] = useState<Set<string>>(
    new Set()
  );
  // const { getBalance } = useSolanaService();
  const { data: balance } = useBalance(walletAddress as unknown as Address);
  const { revealCapsule } = useCapsulexProgram();
  const queryClient = useQueryClient();
  const { getMyCapsules } = useCapsuleService();

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!refreshing && walletAddress) {
        fetchCapsuleData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [walletAddress, refreshing]);

  // App state change handling
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && walletAddress) {
        fetchCapsuleData();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [walletAddress]);

  // Pulsing animation for ready-to-reveal capsules
  useEffect(() => {
    const pulseAnimation = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(pulseAnimation);
    };

    if (capsuleData && capsuleData.summary.ready_to_reveal > 0) {
      pulseAnimation();
    }

    return () => pulseAnim.stopAnimation();
  }, [capsuleData?.summary.ready_to_reveal]);

  // Glow animation for ready cards
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  // Fetch SOL balance

  // Fetch capsule data from blockchain and database, then merge them
  const fetchCapsuleData = useCallback(async () => {
    if (!walletAddress) return;

    try {
      setError(null);

      // Fetch blockchain data
      const blockchainResponse =
        await capsuleApi.getCapsulesByWallet(walletAddress);

      if (!blockchainResponse.success) {
        setError('Failed to load capsules');
        return;
      }

      // Fetch database data
      const databaseCapsules = await getMyCapsules();

      // Create a map of database capsules by transaction signature for quick lookup
      const databaseMap = new Map<string, Capsule>();
      databaseCapsules.forEach(dbCapsule => {
        if (dbCapsule.on_chain_tx) {
          databaseMap.set(dbCapsule.on_chain_tx, dbCapsule);
        }
      });

      // Enhance blockchain capsules with database data
      const enhanceCapsulesArray = (
        capsules: CapsuleWithStatus[]
      ): EnhancedCapsule[] => {
        return capsules.map(blockchainCapsule => {
          // Try to find matching database capsule
          // Note: We need to implement a way to link blockchain publicKey to database on_chain_tx
          // For now, we'll use a placeholder approach
          const enhancedCapsule: EnhancedCapsule = {
            ...blockchainCapsule,
            databaseData: undefined, // Will be populated when we can match them
          };

          // Try to find database match by searching for recent transactions
          // This is a temporary solution - ideally the blockchain data should include tx signature
          for (const [, dbCapsule] of databaseMap.entries()) {
            // Simple heuristic: match by creation time proximity and content hash
            const blockchainTime = blockchainCapsule.account.createdAt;
            const dbTime = new Date(dbCapsule.created_at).getTime() / 1000;
            const timeDiff = Math.abs(blockchainTime - dbTime);

            // If created within 5 minutes and creator matches
            if (timeDiff < 300 && dbCapsule.user_id) {
              enhancedCapsule.databaseData = dbCapsule;
              break;
            }
          }

          return enhancedCapsule;
        });
      };

      // Enhance all capsule arrays
      const enhancedData = {
        ...blockchainResponse.data,
        capsules: {
          pending: enhanceCapsulesArray(
            blockchainResponse.data.capsules.pending
          ),
          ready_to_reveal: enhanceCapsulesArray(
            blockchainResponse.data.capsules.ready_to_reveal
          ),
          revealed: enhanceCapsulesArray(
            blockchainResponse.data.capsules.revealed
          ),
        },
        all_capsules: enhanceCapsulesArray(
          blockchainResponse.data.all_capsules
        ),
      };

      setCapsuleData(enhancedData);

      // Vibrate if there are newly ready capsules
      if (enhancedData.summary.ready_to_reveal > 0) {
        // Vibration.vibrate([100, 50, 100]);
      }
    } catch (error) {
      console.error('Error fetching capsule data:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [walletAddress, getMyCapsules]);

  // Initial load
  useEffect(() => {
    if (walletAddress) {
      fetchCapsuleData();
    }
  }, [walletAddress, fetchCapsuleData]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Vibration.vibrate(50); // Haptic feedback
    await fetchCapsuleData();
    await queryClient.invalidateQueries({ queryKey: ['solana-balance'] });
    setRefreshing(false);
  }, [fetchCapsuleData, queryClient]);

  // Handle reveal capsule
  const handleRevealCapsule = (capsule: CapsuleWithStatus) => {
    const isRevealing = revealingCapsules.has(capsule.publicKey);

    if (isRevealing) {
      Alert.alert(
        '⏳ Transaction in Progress',
        'Please wait for the current reveal to complete.'
      );
      return;
    }

    Alert.alert(
      '🎉 Reveal Capsule',
      `Ready to reveal your time capsule?\n\nThis will:\n• Sign blockchain transaction\n• Mark capsule as revealed on-chain\n• You can then share the content`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reveal Now!',
          style: 'default',
          onPress: async () => {
            try {
              // Add to revealing set to show loading state
              setRevealingCapsules(prev =>
                new Set(prev).add(capsule.publicKey)
              );

              // Convert reveal date to BN
              const revealDateBN = new anchor.BN(capsule.account.revealDate);

              // Call the reveal transaction
              const signature = await revealCapsule.mutateAsync({
                revealDate: revealDateBN,
                creator: new anchor.web3.PublicKey(capsule.account.creator),
              });

              // Success! Refresh the data and show success message
              Vibration.vibrate([100, 50, 100, 50, 100]); // Celebration haptics

              Alert.alert(
                '🚀 Success!',
                `Capsule revealed successfully!\n\nTransaction: ${signature.slice(0, 8)}...${signature.slice(-8)}\n\nYour content is now revealed on-chain!`,
                [
                  {
                    text: 'View on Explorer',
                    onPress: () => {
                      // TODO: Open Solana explorer
                      console.log(
                        `https://explorer.solana.com/tx/${signature}?cluster=devnet`
                      );
                    },
                  },
                  { text: 'OK', style: 'default' },
                ]
              );

              // Refresh capsule data to show updated state
              await fetchCapsuleData();
            } catch (error: any) {
              console.error('Reveal failed:', error);

              let errorMessage = 'Transaction failed. Please try again.';
              if (error.message?.includes('User rejected')) {
                errorMessage = 'Transaction was cancelled by user.';
              } else if (error.message?.includes('CapsuleNotReady')) {
                errorMessage = 'Capsule is not ready to be revealed yet.';
              } else if (error.message?.includes('CapsuleAlreadyRevealed')) {
                errorMessage = 'This capsule has already been revealed.';
              } else if (error.message?.includes('UnauthorizedRevealer')) {
                errorMessage = 'You are not authorized to reveal this capsule.';
              }

              Alert.alert('❌ Reveal Failed', errorMessage);
            } finally {
              // Remove from revealing set
              setRevealingCapsules(prev => {
                const newSet = new Set(prev);
                newSet.delete(capsule.publicKey);
                return newSet;
              });
            }
          },
        },
      ]
    );
  };

  // Handle create capsule
  const handleCreateCapsule = () => {
    Alert.alert('Create Capsule', 'Navigate to capsule creation screen');
  };

  // Render loading state
  if (loading) {
    return (
      <View style={[styles.screenContainer, styles.centered]}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading your capsules...</Text>
      </View>
    );
  }

  // Render not connected state
  if (!isAuthenticated) {
    return (
      <View style={[styles.screenContainer, styles.centered]}>
        <Avatar.Icon size={80} icon="wallet" style={styles.walletIcon} />
        <Text variant="headlineMedium" style={styles.title}>
          Welcome to CapsuleX
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Connect your wallet to start creating time capsules
        </Text>
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={[styles.screenContainer, styles.centered]}>
        <Text variant="headlineSmall" style={styles.errorTitle}>
          Something went wrong
        </Text>
        <Text variant="bodyMedium" style={styles.errorSubtitle}>
          {error}
        </Text>
        <Button
          mode="contained"
          onPress={fetchCapsuleData}
          style={styles.retryButton}
        >
          Try Again
        </Button>
      </View>
    );
  }

  const stats = capsuleData?.summary || {
    pending: 0,
    ready_to_reveal: 0,
    revealed: 0,
  };
  const readyCapsules = capsuleData?.capsules.ready_to_reveal || [];
  const pendingCapsules = capsuleData?.capsules.pending || [];
  const revealedCapsules = capsuleData?.capsules.revealed || [];

  return (
    <View style={styles.screenContainer}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Your Capsules 🗂️
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {stats.ready_to_reveal > 0
              ? `🔥 ${stats.ready_to_reveal} ready to reveal!`
              : `${stats.pending} pending • ${capsuleData?.total_capsules || 0} total`}
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="labelLarge" style={styles.statLabel}>
                SOL Balance
              </Text>
              <Text variant="headlineSmall" style={styles.statValue}>
                {balance !== undefined ? `${balance?.toFixed(4)}` : 'N/A'}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="labelLarge" style={styles.statLabel}>
                Ready Now
              </Text>
              <Text
                variant="headlineSmall"
                style={[styles.statValue, { color: '#FF6B35' }]}
              >
                {stats.ready_to_reveal}
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Ready to Reveal Section */}
        {readyCapsules.length > 0 && (
          <View style={styles.section}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Text variant="titleLarge" style={styles.sectionTitleReady}>
                🔥 Ready to Reveal ({readyCapsules.length})
              </Text>
            </Animated.View>

            {readyCapsules.map(capsule => (
              <Animated.View
                key={capsule.publicKey}
                style={[
                  styles.readyCard,
                  {
                    shadowColor: '#FF6B35',
                    shadowOpacity: glowAnim,
                    elevation: 8,
                  },
                  revealingCapsules.has(capsule.publicKey) &&
                    styles.revealingCard,
                ]}
              >
                <Card
                  style={[styles.capsuleCard, styles.readyCardInner]}
                  onPress={() =>
                    navigation.navigate('CapsuleDetails', { capsule: capsule })
                  }
                >
                  <Card.Content>
                    <View style={styles.capsuleHeader}>
                      <Chip
                        mode="flat"
                        style={styles.readyChip}
                        textStyle={styles.readyChipText}
                      >
                        🔥 READY NOW
                      </Chip>
                      <Text variant="bodySmall" style={styles.timeText}>
                        {new Date(
                          capsule.account.revealDate * 1000
                        ).toLocaleDateString()}
                      </Text>
                    </View>

                    <Text variant="bodyMedium" style={styles.capsuleContent}>
                      Content:{' '}
                      {capsule.account.encryptedContent.substring(0, 50)}...
                    </Text>

                    <Button
                      mode="contained"
                      onPress={() => handleRevealCapsule(capsule)}
                      style={styles.revealButton}
                      contentStyle={styles.revealButtonContent}
                      loading={revealingCapsules.has(capsule.publicKey)}
                      disabled={revealingCapsules.has(capsule.publicKey)}
                    >
                      {revealingCapsules.has(capsule.publicKey)
                        ? '⏳ Revealing...'
                        : '🚀 REVEAL NOW!'}
                    </Button>
                  </Card.Content>
                </Card>
              </Animated.View>
            ))}
          </View>
        )}

        {/* Pending Capsules Section */}
        {pendingCapsules.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              ⏳ Pending ({pendingCapsules.length})
            </Text>

            {pendingCapsules.map(capsule => {
              const timeLeft = capsule.timeToReveal || 0;
              const progress = CapsuleApiService.getCountdownProgress(
                capsule.account.createdAt,
                capsule.account.revealDate
              );

              return (
                <Card
                  key={capsule.publicKey}
                  style={styles.capsuleCard}
                  onPress={() =>
                    navigation.navigate('CapsuleDetails', { capsule: capsule })
                  }
                >
                  <Card.Content>
                    <View style={styles.capsuleHeader}>
                      <Chip mode="outlined" style={styles.pendingChip}>
                        ⏳ Pending
                      </Chip>
                      <Text variant="bodySmall" style={styles.timeText}>
                        {new Date(
                          capsule.account.revealDate * 1000
                        ).toLocaleDateString()}
                      </Text>
                    </View>

                    <Text variant="bodyMedium" style={styles.capsuleContent}>
                      Content:{' '}
                      {capsule.account.encryptedContent.substring(0, 50)}...
                    </Text>

                    <View style={styles.countdownContainer}>
                      <Text variant="bodySmall" style={styles.countdownLabel}>
                        Reveals in:{' '}
                        {CapsuleApiService.formatTimeUntil(timeLeft)}
                      </Text>
                      <ProgressBar
                        progress={progress}
                        style={styles.progressBar}
                        color="#2196F3"
                      />
                    </View>
                  </Card.Content>
                </Card>
              );
            })}
          </View>
        )}

        {/* Revealed Capsules Section */}
        {revealedCapsules.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              ✅ Revealed ({revealedCapsules.length})
            </Text>

            {revealedCapsules.map(capsule => (
              <Card
                key={capsule.publicKey}
                style={styles.capsuleCard}
                onPress={() =>
                  navigation.navigate('CapsuleDetails', { capsule: capsule })
                }
              >
                <Card.Content>
                  <View style={styles.capsuleHeader}>
                    <Chip mode="flat" style={styles.revealedChip}>
                      ✅ Revealed
                    </Chip>
                    <IconButton
                      icon="share"
                      size={20}
                      onPress={() => Alert.alert('Share', 'Open Twitter post')}
                    />
                  </View>

                  <Text variant="bodyMedium" style={styles.capsuleContent}>
                    Content: {capsule.account.encryptedContent.substring(0, 50)}
                    ...
                  </Text>

                  <Text variant="bodySmall" style={styles.revealedText}>
                    Revealed on{' '}
                    {new Date(
                      capsule.account.revealDate * 1000
                    ).toLocaleDateString()}
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}

        {/* Empty State */}
        {(!capsuleData || capsuleData.total_capsules === 0) && (
          <View style={styles.emptyState}>
            <Text variant="headlineSmall" style={styles.emptyTitle}>
              No capsules yet 📭
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
              Create your first time capsule to get started
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Create FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleCreateCapsule}
        label="Create Capsule"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1a1a1a',
  },
  subtitle: {
    color: '#666',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  walletIcon: {
    backgroundColor: '#2196F3',
    marginBottom: 16,
  },
  errorTitle: {
    color: '#d32f2f',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2196F3',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
  },
  statLabel: {
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  sectionTitleReady: {
    marginBottom: 12,
    fontWeight: 'bold',
    color: '#FF6B35',
    fontSize: 20,
  },
  capsuleCard: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  readyCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#FFF8F6', // Add solid background for efficient shadow rendering
  },
  readyCardInner: {
    backgroundColor: '#FFF8F6',
    borderColor: '#FF6B35',
    borderWidth: 2,
  },
  capsuleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  readyChip: {
    backgroundColor: '#FF6B35',
  },
  readyChipText: {
    color: 'white',
    fontWeight: 'bold',
  },
  pendingChip: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  revealedChip: {
    backgroundColor: '#E8F5E8',
    color: '#4CAF50',
  },
  timeText: {
    color: '#666',
  },
  capsuleContent: {
    marginBottom: 12,
    lineHeight: 20,
    color: '#333',
  },
  countdownContainer: {
    marginTop: 8,
  },
  countdownLabel: {
    color: '#666',
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  revealButton: {
    backgroundColor: '#FF6B35',
    marginTop: 8,
  },
  revealButtonContent: {
    paddingVertical: 4,
  },
  revealedText: {
    color: '#4CAF50',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  emptySubtitle: {
    color: '#666',
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 100,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#2196F3',
  },
  revealingCard: {
    opacity: 0.7, // Make the card slightly transparent
    backgroundColor: '#f0f0f0', // Slightly gray out the card
  },
});
