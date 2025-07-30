import * as anchor from '@coral-xyz/anchor';
import MaterialCommunityIcon from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Address } from '@solana/kit';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Alert,
  Vibration,
  AppState,
  Platform,
} from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import {
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

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

  // Animation values using react-native-reanimated
  const pulseAnim = useSharedValue(1);
  const glowAnim = useSharedValue(0.3);

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
    if (capsuleData && capsuleData.summary.ready_to_reveal > 0) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1, // Infinite repeat
        false
      );
    }
  }, [capsuleData?.summary.ready_to_reveal]);

  // Glow animation for ready cards
  useEffect(() => {
    glowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0.3, { duration: 1500 })
      ),
      -1, // Infinite repeat
      false
    );
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

  // Render hero content (shared between iOS gradient and Android fallback)
  const renderHeroContent = () => (
    <>
      <View style={styles.titleContainer}>
        <MaterialCommunityIcon
          name="timer-sand"
          size={32}
          color={colors.primary}
          style={styles.titleIcon}
        />
        <Text style={styles.heroTitle}>Time Capsules</Text>
      </View>
      <View style={styles.subtitleContainer}>
        {stats.ready_to_reveal > 0 ? (
          <Text style={styles.heroSubtitle}>
            <Text style={styles.highlightText}>{stats.ready_to_reveal}</Text>
            <Text style={styles.subtitleText}> capsules ready to reveal </Text>
            <Text style={styles.accentText}>🔥</Text>
          </Text>
        ) : (
          <Text style={styles.heroSubtitle}>
            <Text style={styles.highlightText}>{stats.pending}</Text>
            <Text style={styles.subtitleText}> pending • </Text>
            <Text style={styles.highlightText}>
              {capsuleData?.total_capsules || 0}
            </Text>
            <Text style={styles.subtitleText}> total capsules</Text>
          </Text>
        )}
      </View>
      <View style={styles.heroStats}>
        <View style={styles.statItem}>
          <MaterialCommunityIcon
            name="wallet"
            size={28}
            color={colors.primary}
          />
          <Text style={styles.statValue}>
            {balance !== undefined ? `${balance?.toFixed(4)}` : 'N/A'}
          </Text>
          <Text style={styles.statLabel}>SOL Balance</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcon
            name="fire"
            size={28}
            color={colors.premiumOrange}
          />
          <Text style={styles.statValue}>{stats.ready_to_reveal}</Text>
          <Text style={styles.statLabel}>Ready Now</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcon
            name="clock-outline"
            size={28}
            color={colors.primary}
          />
          <Text style={styles.statValue}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>
    </>
  );

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
        {/* Unified Hero Section with Gradient Background */}
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
            <Text variant="bodySmall" style={styles.emptyHint}>
              💡 Tap the "Create" tab below to begin
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
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
  // Modern Hero Section
  heroContainer: {
    borderRadius: 20,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
    overflow: 'hidden', // Ensures gradient respects border radius
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
  highlightText: {
    ...typography.titleLarge,
    color: colors.primary,
    fontWeight: 'bold',
  },
  subtitleText: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
  },
  accentText: {
    fontSize: 18,
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
  emptyHint: {
    ...typography.bodySmall,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  bottomSpacing: {
    height: 100,
  },
  // Fix for LinearGradient rendering issues
  gradientFix: {
    flex: 1,
    width: '100%',
    minHeight: 200, // Ensure minimum height for gradient to render
  },
  // Android gradient enhancement - match iOS visual impact
  androidGradientEnhancement: {
    borderWidth: 1,
    borderColor: colors.primary + '30', // More visible border
    elevation: 6, // Higher elevation for more shadow
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, // More visible shadow
    shadowRadius: 10,
    // Add a subtle overlay effect
    backgroundColor: 'rgba(29, 161, 242, 0.02)', // Very subtle base tint
  },
});
