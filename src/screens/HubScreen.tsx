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
import { Text, Card, FAB, Button, ActivityIndicator } from 'react-native-paper';

import { HorizontalCapsuleList } from '../components/capsules';
import { useDualAuth } from '../providers';
import type {
  CapsuleWithStatus,
  WalletCapsulesResponse,
} from '../services/capsuleApi';
import { capsuleApi } from '../services/capsuleApi';
import { useCapsuleService } from '../services/capsuleService';
import { dynamicClientService } from '../services/dynamicClientService';
import { useBalance } from '../services/solana';
import { useCapsulexProgram } from '../solana/useCapsulexProgram';
import {
  colors,
  typography,
  spacing,
  layout,
  shadows,
  components,
} from '../theme';
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

  // lets hide the dynamic client from the screen
  useEffect(() => {
    const hideDynamicClient = async () => {
      // wait for 2
      dynamicClientService.refreshClient();
      if (dynamicClientService.getDynamicClient()?.ui.userProfile) {
        dynamicClientService.getDynamicClient()?.ui.userProfile.hide();
      }
    };
    hideDynamicClient();
  }, []);

  // Authentication guard - navigate to onboarding if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      console.log(
        '🔍 HubScreen - User not authenticated, navigating to onboarding screen'
      );
      navigation.navigate('Onboarding' as never);
    }
  }, [isAuthenticated, navigation]);

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

      // Debug: Log first few blockchain capsules to understand structure
      // console.log(`🔍 HubScreen - Found ${blockchainResponse.data.total_capsules} blockchain capsules`);
      // blockchainResponse.data.all_capsules.slice(0, 3).forEach((bcCapsule, index) => {
      //   console.log(`🔍 Blockchain capsule ${index}:`, {
      //     publicKey: bcCapsule.publicKey,
      //     createdAt: bcCapsule.account.createdAt,
      //     encryptedContent: bcCapsule.account.encryptedContent?.substring(0, 50) + '...',
      //     creator: bcCapsule.account.creator
      //   });
      // });

      // Fetch database data
      const databaseCapsules = await getMyCapsules();
      // console.log(`🔍 HubScreen - Found ${databaseCapsules.length} database capsules`);

      // Debug: Log first few database capsules to understand structure
      // databaseCapsules.slice(0, 3).forEach((dbCapsule, index) => {
      //   console.log(`🔍 Database capsule ${index}:`, {
      //     capsule_id: dbCapsule.capsule_id,
      //     on_chain_tx: dbCapsule.on_chain_tx,
      //     created_at: dbCapsule.created_at,
      //     has_content: !!dbCapsule.content_encrypted,
      //     content_preview: dbCapsule.content_encrypted?.substring(0, 50) + '...'
      //   });
      // });

      // Create a simple map for matching - let's keep it simple like it was before
      const databaseMap = new Map<string, Capsule>();
      databaseCapsules.forEach(dbCapsule => {
        // Try multiple keys for matching
        if (dbCapsule.on_chain_tx) {
          databaseMap.set(dbCapsule.on_chain_tx, dbCapsule);
        }
        // Also try capsule_id as a key
        if (dbCapsule.capsule_id) {
          databaseMap.set(dbCapsule.capsule_id, dbCapsule);
        }
      });

      // Enhance blockchain capsules with database data
      const enhanceCapsulesArray = (
        capsules: CapsuleWithStatus[]
      ): EnhancedCapsule[] => {
        return capsules.map((blockchainCapsule, index) => {
          const enhancedCapsule: EnhancedCapsule = {
            ...blockchainCapsule,
            databaseData: undefined,
          };

          // Try direct matching by various keys first
          const matchedCapsule = databaseMap.get(blockchainCapsule.publicKey);

          if (matchedCapsule) {
            console.log(
              `✅ HubScreen - Matched by publicKey: ${blockchainCapsule.publicKey}`
            );
            enhancedCapsule.databaseData = matchedCapsule;
            return enhancedCapsule;
          }

          // Match by comparing creation times (more reliable than exact matching)
          const blockchainTime = blockchainCapsule.account.createdAt;
          let bestMatch: Capsule | null = null;
          let smallestTimeDiff = Infinity;

          for (const dbCapsule of databaseCapsules) {
            const dbTime = new Date(dbCapsule.created_at).getTime() / 1000;
            const timeDiff = Math.abs(blockchainTime - dbTime);

            if (timeDiff < smallestTimeDiff) {
              smallestTimeDiff = timeDiff;
              bestMatch = dbCapsule;
            }
          }

          // Use the best time match if it's within a reasonable window (30 minutes)
          if (bestMatch && smallestTimeDiff < 1800) {
            enhancedCapsule.databaseData = bestMatch;
            // console.log(`✅ HubScreen - Matched by time (${smallestTimeDiff}s diff): ${blockchainCapsule.publicKey} -> ${bestMatch.capsule_id}`);
            return enhancedCapsule;
          }

          // Fallback: assign in order if time matching fails
          if (databaseCapsules[index]) {
            enhancedCapsule.databaseData = databaseCapsules[index];
            // console.log(`✅ HubScreen - Fallback assignment: database capsule ${index} to blockchain capsule ${blockchainCapsule.publicKey}`);
            return enhancedCapsule;
          }

          // If no match found
          // console.log(`⚠️ HubScreen - No database match for capsule: ${blockchainCapsule.publicKey}`);
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

  // Authentication handled by useEffect above - no need to render

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
          <Text variant="headlineLarge" style={styles.title}>
            Time Capsules
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            {stats.ready_to_reveal > 0
              ? `${stats.ready_to_reveal} ready to reveal`
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
                style={[styles.statValue, { color: colors.premiumOrange }]}
              >
                {stats.ready_to_reveal}
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Ready to Reveal Section */}
        {readyCapsules.length > 0 && (
          <HorizontalCapsuleList
            title="Ready to Reveal"
            capsules={readyCapsules}
            type="ready"
            onRevealCapsule={handleRevealCapsule}
            revealingCapsules={revealingCapsules}
            glowAnim={glowAnim}
          />
        )}

        {/* Pending Capsules Section */}
        {pendingCapsules.length > 0 && (
          <HorizontalCapsuleList
            title="Pending"
            capsules={pendingCapsules}
            type="pending"
          />
        )}

        {/* Revealed Capsules Section */}
        {revealedCapsules.length > 0 && (
          <HorizontalCapsuleList
            title="Revealed"
            capsules={revealedCapsules}
            type="revealed"
          />
        )}

        {/* Empty State */}
        {(!capsuleData || capsuleData.total_capsules === 0) && (
          <View style={styles.emptyState}>
            <Text variant="headlineSmall" style={styles.emptyTitle}>
              No capsules yet
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
        label="New Capsule"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    ...layout.screenContainer,
  },
  centered: {
    ...layout.centered,
    padding: spacing.sectionPadding,
  },
  // Netflix-inspired header
  header: {
    ...layout.heroSection,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.headlineLarge,
    marginBottom: spacing.xs,
    color: colors.text,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  loadingText: {
    ...typography.bodyMedium,
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  walletIcon: {
    backgroundColor: colors.primary,
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.headlineSmall,
    color: colors.error,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorSubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    ...components.primaryButton,
  },
  // Premium stats section
  statsContainer: {
    flexDirection: 'row',
    ...layout.contentSection,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    ...components.card,
  },
  statLabel: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.headlineSmall,
    color: colors.primary,
  },

  // Premium empty state
  emptyState: {
    alignItems: 'center',
    ...layout.premiumSpacing,
  },
  emptyTitle: {
    ...typography.headlineSmall,
    marginBottom: spacing.sm,
    color: colors.text,
  },
  emptySubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 100,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.primary,
    ...shadows.medium,
  },
});
