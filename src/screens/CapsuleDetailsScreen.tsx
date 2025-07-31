import type { RouteProp } from '@react-navigation/native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, Platform, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  IconButton,
  Button,
  Chip,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import MaterialCommunityIcon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { AppSnackbar } from '../components/ui/AppSnackbar';
import { useSnackbar } from '../hooks/useSnackbar';
import { useDualAuth } from '../providers';
import type { CapsuleWithStatus } from '../services/capsuleApi';
import type { Capsule } from '../types/api';
import { VaultKeyManager } from '../utils/vaultKey';
import {
  colors,
  typography,
  spacing,
  layout,
  shadows,
  components,
} from '../theme';

// Type definitions

// Enhanced capsule type that merges blockchain and database data
interface EnhancedCapsule extends CapsuleWithStatus {
  databaseData?: Capsule; // Additional database fields including content_encrypted
}

type RootStackParamList = {
  CapsuleDetails: { capsule: EnhancedCapsule };
};

type CapsuleDetailsRouteProp = RouteProp<RootStackParamList, 'CapsuleDetails'>;
type CapsuleDetailsNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CapsuleDetails'
>;

export function CapsuleDetailsScreen() {
  const route = useRoute<CapsuleDetailsRouteProp>();
  const navigation = useNavigation<CapsuleDetailsNavigationProp>();
  const { capsule } = route.params;

  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [fullCapsuleData, setFullCapsuleData] = useState<Capsule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { isAuthenticated, walletAddress } = useDualAuth();
  const { snackbar, showError, showSuccess, hideSnackbar } = useSnackbar();

  // Process the enhanced capsule data from HubScreen
  useEffect(() => {
    const processCapsuleData = async () => {
      try {
        setIsLoading(true);

        console.log('🔍 Debug - received enhanced capsule param:', capsule);

        // Check if we have database data with encrypted content
        if (capsule.databaseData?.content_encrypted) {
          console.log(
            '✅ Enhanced capsule has database data with encrypted content'
          );
          setFullCapsuleData(capsule.databaseData);
        } else {
          // No database data - this is expected for capsules that haven't been matched yet
          // Just set fullCapsuleData to null and display with blockchain data
          console.log(
            '⚠️ Enhanced capsule missing database data. Will display with blockchain data only.'
          );
          setFullCapsuleData(null); // UI will use blockchain data as fallback
        }
      } catch (error) {
        console.error('❌ Failed to process capsule data:', error);
        setFullCapsuleData(null); // Fallback to blockchain data display
      } finally {
        setIsLoading(false);
      }
    };

    processCapsuleData();
  }, [capsule]);

  const handleDecryptContent = async () => {
    if (!isAuthenticated) {
      showError('Please connect your wallet to decrypt content');
      return;
    }

    if (!fullCapsuleData?.content_encrypted) {
      Alert.alert(
        'Content Not Available',
        'This capsule was created with an older system or the encrypted content is not yet available. You can see the basic capsule information but cannot decrypt the content.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Note: Creators can always decrypt their own content with their vault key
    // The reveal date only applies to public/social sharing

    if (decryptedContent && showContent) {
      // Content is already decrypted and shown, just hide it
      setShowContent(false);
      return;
    }

    if (decryptedContent && !showContent) {
      // Content is decrypted but hidden, just show it
      setShowContent(true);
      return;
    }

    // Need to decrypt the content
    setIsDecrypting(true);

    try {
      // Parse the encrypted content from database
      console.log(
        '🔍 Debug - content_encrypted raw:',
        fullCapsuleData.content_encrypted
      );

      let encryptedContent;
      try {
        encryptedContent = JSON.parse(fullCapsuleData.content_encrypted);
        console.log('🔍 Debug - parsed encryptedContent:', encryptedContent);
      } catch (parseError) {
        console.error('❌ JSON parse failed:', parseError);
        console.log(
          '❌ Raw content that failed to parse:',
          fullCapsuleData.content_encrypted
        );

        // Handle old format or plain text content
        Alert.alert(
          'Incompatible Content Format',
          'This capsule was created with an older encryption format and cannot be decrypted with the current system.',
          [{ text: 'OK' }]
        );
        setIsDecrypting(false);
        return;
      }

      // Check if this wallet matches the original creator
      if (encryptedContent.walletAddress !== walletAddress) {
        Alert.alert(
          'Unable to Decrypt',
          'This content was created with a different wallet. You can only decrypt capsules created with your current wallet on this device.',
          [{ text: 'OK' }]
        );
        setIsDecrypting(false);
        return;
      }

      // Check if we have the vault key on this device
      const hasVaultKey = await VaultKeyManager.hasVaultKey(
        walletAddress as string
      );
      if (!hasVaultKey) {
        Alert.alert(
          'Vault Key Not Found',
          'This device does not have the vault key needed to decrypt this content. The content was encrypted on a different device.',
          [
            { text: 'OK' },
            {
              text: 'Import Key',
              onPress: () => {
                // TODO: Navigate to vault key import screen
                showError('Vault key import feature coming soon!');
              },
            },
          ]
        );
        setIsDecrypting(false);
        return;
      }

      // Decrypt using device vault key (no wallet signing required!)
      const content = await VaultKeyManager.decryptContent(encryptedContent);

      setDecryptedContent(content);
      setShowContent(true);
      showSuccess('Content decrypted successfully');
    } catch (error) {
      console.error('❌ Vault decryption failed:', error);
      showError(
        'Failed to decrypt content. The vault key might be corrupted or the content is damaged.'
      );
    } finally {
      setIsDecrypting(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'revealed':
        return colors.success;
      case 'ready_to_reveal':
        return colors.warning;
      default:
        return colors.primary;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'revealed':
        return 'lock-open';
      case 'ready_to_reveal':
        return 'clock-alert';
      default:
        return 'lock';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'revealed':
        return 'Revealed';
      case 'ready_to_reveal':
        return 'Ready to Reveal';
      default:
        return 'Pending';
    }
  };

  const isRevealed = fullCapsuleData
    ? new Date(fullCapsuleData.reveal_date) <= new Date()
    : capsule
      ? new Date(capsule.account.revealDate * 1000) <= new Date()
      : false;

  // Helper function to extract process capsule data
  const processCapsuleData = async () => {
    try {
      setIsLoading(true);

      console.log('🔍 Debug - received enhanced capsule param:', capsule);

      // Check if we have database data with encrypted content
      if (capsule.databaseData?.content_encrypted) {
        console.log(
          '✅ Enhanced capsule has database data with encrypted content'
        );
        setFullCapsuleData(capsule.databaseData);
      } else {
        // No database data - this is expected for capsules that haven't been matched yet
        // Just set fullCapsuleData to null and display with blockchain data
        console.log(
          '⚠️ Enhanced capsule missing database data. Will display with blockchain data only.'
        );
        setFullCapsuleData(null); // UI will use blockchain data as fallback
      }
    } catch (error) {
      console.error('❌ Failed to process capsule data:', error);
      setFullCapsuleData(null); // Fallback to blockchain data display
    } finally {
      setIsLoading(false);
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Re-process capsule data
      await processCapsuleData();
    } finally {
      setRefreshing(false);
    }
  };

  // Render hero content
  const renderHeroContent = () => (
    <>
      <View style={styles.titleContainer}>
        <MaterialCommunityIcon
          name="package-variant-closed"
          size={32}
          color={colors.primary}
          style={styles.titleIcon}
        />
        <Text style={styles.heroTitle}>Capsule Details</Text>
      </View>
      <View style={styles.subtitleContainer}>
        <Text style={styles.heroSubtitle}>
          <Text style={styles.highlightText}>{getStatusText(fullCapsuleData?.status)}</Text>
          <Text style={styles.subtitleText}> status • </Text>
          <Text style={styles.highlightText}>{fullCapsuleData?.content_encrypted ? 'Encrypted' : 'Plain'}</Text>
          <Text style={styles.subtitleText}> content</Text>
        </Text>
      </View>
      <View style={styles.heroStats}>
        <View style={styles.statItem}>
          <MaterialCommunityIcon
            name={getStatusIcon(fullCapsuleData?.status)}
            size={28}
            color={getStatusColor(fullCapsuleData?.status)}
          />
          <Text style={styles.statValue}>{getStatusText(fullCapsuleData?.status)}</Text>
          <Text style={styles.statLabel}>Status</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcon
            name={fullCapsuleData?.content_encrypted ? "lock" : "lock-open"}
            size={28}
            color={fullCapsuleData?.content_encrypted ? colors.warning : colors.success}
          />
          <Text style={styles.statValue}>{fullCapsuleData?.content_encrypted ? 'Encrypted' : 'Plain'}</Text>
          <Text style={styles.statLabel}>Content</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcon
            name={isRevealed ? "calendar-check" : "calendar-clock"}
            size={28}
            color={isRevealed ? colors.success : colors.primary}
          />
          <Text style={styles.statValue}>{isRevealed ? 'Revealed' : 'Pending'}</Text>
          <Text style={styles.statLabel}>Timeline</Text>
        </View>
      </View>
    </>
  );

  // Show loading state while processing data
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading capsule details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.headerRow}>
              <View style={styles.headerTitleContainer}>
                <MaterialCommunityIcon
                  name="information-outline"
                  size={24}
                  color={colors.primary}
                  style={styles.headerIcon}
                />
                <Text variant="headlineSmall" style={styles.title}>
                  Capsule Overview
                </Text>
              </View>
              <Chip
                style={[
                  styles.statusChip,
                  { backgroundColor: getStatusColor(fullCapsuleData?.status) + '20' },
                ]}
                textStyle={{ color: getStatusColor(fullCapsuleData?.status) }}
                icon={() => (
                  <MaterialCommunityIcon
                    name={getStatusIcon(fullCapsuleData?.status)}
                    size={16}
                    color={getStatusColor(fullCapsuleData?.status)}
                  />
                )}
              >
                {getStatusText(fullCapsuleData?.status)}
              </Chip>
            </View>
            <View style={styles.capsuleIdContainer}>
              <MaterialCommunityIcon
                name="identifier"
                size={16}
                color={colors.textSecondary}
                style={styles.capsuleIdIcon}
              />
              <Text variant="bodyMedium" style={styles.capsuleId}>
                {fullCapsuleData?.capsule_id ||
                  capsule.publicKey.slice(0, 8) + '...'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Encrypted Content Card */}
        <Card style={styles.contentCard}>
          <Card.Content>
            <View style={styles.contentHeader}>
              <View style={styles.sectionTitleContainer}>
                <MaterialCommunityIcon
                  name={fullCapsuleData?.content_encrypted ? "lock" : "lock-open"}
                  size={20}
                  color={colors.primary}
                  style={styles.sectionTitleIcon}
                />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  {fullCapsuleData?.content_encrypted ? 'Encrypted Content' : 'Content'}
                </Text>
              </View>
              <IconButton
                icon={() => (
                  <MaterialCommunityIcon
                    name={showContent ? "eye-off" : "eye"}
                    size={24}
                    color={isDecrypting || !fullCapsuleData?.content_encrypted ? colors.textSecondary : colors.primary}
                  />
                )}
                onPress={handleDecryptContent}
                disabled={isDecrypting || !fullCapsuleData?.content_encrypted}
                style={styles.eyeButton}
              />
            </View>

            <View style={styles.contentArea}>
              {showContent && decryptedContent ? (
                <View style={styles.decryptedContentContainer}>
                  <MaterialCommunityIcon
                    name="check-circle"
                    size={20}
                    color={colors.success}
                    style={styles.contentStatusIcon}
                  />
                  <Text variant="bodyLarge" style={styles.decryptedText}>
                    {decryptedContent}
                  </Text>
                </View>
              ) : (
                <View style={styles.encryptedContentContainer}>
                  <MaterialCommunityIcon
                    name={isDecrypting ? "loading" : fullCapsuleData?.content_encrypted ? "lock" : "alert-circle"}
                    size={20}
                    color={isDecrypting ? colors.primary : fullCapsuleData?.content_encrypted ? colors.warning : colors.textSecondary}
                    style={styles.contentStatusIcon}
                  />
                  <Text variant="bodyMedium" style={styles.encryptedText}>
                    {isDecrypting
                      ? 'Decrypting...'
                      : fullCapsuleData?.content_encrypted
                        ? 'Content is encrypted with your device vault key. Click the eye icon to decrypt and view.'
                        : 'Encrypted content not available. This capsule may have been created with an older system.'}
                  </Text>
                </View>
              )}
            </View>

            {walletAddress && (
              <View style={styles.walletInfoContainer}>
                <MaterialCommunityIcon
                  name="wallet"
                  size={16}
                  color={colors.textSecondary}
                  style={styles.walletIcon}
                />
                <Text variant="bodySmall" style={styles.walletInfo}>
                  {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-8)}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Timeline Card */}
        <Card style={styles.timelineCard}>
          <Card.Content>
            <View style={styles.sectionTitleContainer}>
              <MaterialCommunityIcon
                name="timeline-clock"
                size={20}
                color={colors.primary}
                style={styles.sectionTitleIcon}
              />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Timeline
              </Text>
            </View>

            <View style={styles.timelineItem}>
              <View style={styles.timelineItemLeft}>
                <MaterialCommunityIcon
                  name="calendar-plus"
                  size={16}
                  color={colors.textSecondary}
                  style={styles.timelineIcon}
                />
                <Text variant="bodyMedium" style={styles.timelineLabel}>
                  Created:
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.timelineValue}>
                {fullCapsuleData
                  ? new Date(fullCapsuleData.created_at).toLocaleString()
                  : new Date(capsule.account.createdAt * 1000).toLocaleString()}
              </Text>
            </View>

            <View style={styles.timelineItem}>
              <View style={styles.timelineItemLeft}>
                <MaterialCommunityIcon
                  name={isRevealed ? "calendar-check" : "calendar-clock"}
                  size={16}
                  color={isRevealed ? colors.success : colors.warning}
                  style={styles.timelineIcon}
                />
                <Text variant="bodyMedium" style={styles.timelineLabel}>
                  Reveal Date:
                </Text>
              </View>
              <View style={styles.revealDateContainer}>
                <Text
                  variant="bodyMedium"
                  style={[
                    styles.revealDate,
                    { color: isRevealed ? colors.success : colors.warning },
                  ]}
                >
                  {fullCapsuleData
                    ? new Date(fullCapsuleData.reveal_date).toLocaleString()
                    : new Date(
                        capsule.account.revealDate * 1000
                      ).toLocaleString()}
                </Text>
                <MaterialCommunityIcon
                  name={isRevealed ? "check-circle" : "clock-outline"}
                  size={16}
                  color={isRevealed ? colors.success : colors.warning}
                  style={styles.revealStatusIcon}
                />
              </View>
            </View>

            {fullCapsuleData?.revealed_at && (
              <View style={styles.timelineItem}>
                <View style={styles.timelineItemLeft}>
                  <MaterialCommunityIcon
                    name="lock-open"
                    size={16}
                    color={colors.success}
                    style={styles.timelineIcon}
                  />
                  <Text variant="bodyMedium" style={styles.timelineLabel}>
                    Revealed:
                  </Text>
                </View>
                <Text variant="bodyMedium" style={styles.timelineValue}>
                  {new Date(fullCapsuleData?.revealed_at!).toLocaleString()}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Technical Details Card */}
        <Card style={styles.technicalCard}>
          <Card.Content>
            <View style={styles.sectionTitleContainer}>
              <MaterialCommunityIcon
                name="cog"
                size={20}
                color={colors.primary}
                style={styles.sectionTitleIcon}
              />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Technical Details
              </Text>
            </View>

            <View style={styles.techItem}>
              <Text variant="bodyMedium" style={styles.techLabel}>
                Blockchain TX:
              </Text>
              <Text variant="bodySmall" style={styles.techValue}>
                {fullCapsuleData?.on_chain_tx?.slice(0, 16) ||
                  capsule.publicKey.slice(0, 16)}
                ...
                {fullCapsuleData?.on_chain_tx?.slice(-16) ||
                  capsule.publicKey.slice(-16)}
              </Text>
            </View>

            <View style={styles.techItem}>
              <Text variant="bodyMedium" style={styles.techLabel}>
                Content Hash:
              </Text>
              <Text variant="bodySmall" style={styles.techValue}>
                {fullCapsuleData?.content_hash?.slice(0, 16) ||
                  capsule.account.contentIntegrityHash.slice(0, 16)}
                ...
                {fullCapsuleData?.content_hash?.slice(-16) ||
                  capsule.account.contentIntegrityHash.slice(-16)}
              </Text>
            </View>

            <View style={styles.techItem}>
              <Text variant="bodyMedium" style={styles.techLabel}>
                SOL Fee:
              </Text>
              <Text variant="bodyMedium">
                {fullCapsuleData?.sol_fee_amount || '0.0014'} SOL
              </Text>
            </View>

            {fullCapsuleData?.has_media && (
              <View style={styles.techItem}>
                <Text variant="bodyMedium" style={styles.techLabel}>
                  Media Files:
                </Text>
                <Text variant="bodyMedium">
                  {fullCapsuleData?.media_urls?.length || 0} file(s)
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Social Sharing Card */}
        {fullCapsuleData?.posted_to_social && (
          <Card style={styles.socialCard}>
            <Card.Content>
              <View style={styles.sectionTitleContainer}>
                <MaterialCommunityIcon
                  name="share-variant"
                  size={20}
                  color={colors.primary}
                  style={styles.sectionTitleIcon}
                />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Social Sharing
                </Text>
              </View>

              <View style={styles.socialItem}>
                <MaterialCommunityIcon
                  name="check-circle"
                  size={16}
                  color={colors.success}
                  style={styles.socialIcon}
                />
                <Text variant="bodyMedium" style={styles.socialText}>Posted to Social</Text>
              </View>

              {fullCapsuleData?.social_post_id && (
                <View style={styles.socialItem}>
                  <Text variant="bodyMedium" style={styles.techLabel}>
                    Post ID:
                  </Text>
                  <Text variant="bodySmall" style={styles.techValue}>
                    {fullCapsuleData?.social_post_id}
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        <Divider style={styles.divider} />

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isRevealed && (
            <Button
              mode="contained"
              onPress={() => {
                // TODO: Implement reveal functionality
                showSuccess('Reveal functionality coming soon!');
              }}
              style={styles.actionButton}
            >
              Reveal Capsule
            </Button>
          )}

          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.actionButton}
          >
            Back to List
          </Button>
        </View>
      </ScrollView>

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
  container: {
    ...layout.screenContainer,
  },
  centerContainer: {
    ...layout.centered,
    ...layout.premiumSpacing,
  },
  scrollView: {
    flex: 1,
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },

  // Modern Hero Section (from established pattern)
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
  highlightText: {
    ...typography.titleLarge,
    color: colors.primary,
    fontWeight: 'bold',
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

  // Header Card
  headerCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    marginRight: spacing.sm,
  },
  title: {
    ...typography.headlineSmall,
    color: colors.text,
    fontWeight: 'bold',
  },
  statusChip: {
    borderRadius: 12,
  },
  capsuleIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  capsuleIdIcon: {
    marginRight: spacing.sm,
  },
  capsuleId: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },

  // Content Card
  contentCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitleIcon: {
    marginRight: spacing.sm,
  },
  sectionTitle: {
    ...typography.titleMedium,
    color: colors.primary,
    fontWeight: 'bold',
  },
  eyeButton: {
    margin: 0,
  },
  contentArea: {
    minHeight: 80,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  decryptedContentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  encryptedContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentStatusIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  decryptedText: {
    ...typography.bodyLarge,
    color: colors.text,
    lineHeight: 24,
    flex: 1,
  },
  encryptedText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    flex: 1,
  },
  walletInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIcon: {
    marginRight: spacing.sm,
  },
  walletInfo: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },

  // Timeline Card
  timelineCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  timelineItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timelineIcon: {
    marginRight: spacing.sm,
  },
  timelineLabel: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '500',
  },
  timelineValue: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'right',
    flex: 1,
  },
  revealDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  revealDate: {
    ...typography.bodyMedium,
    fontWeight: '500',
  },
  revealStatusIcon: {
    marginLeft: spacing.sm,
  },

  // Technical Card
  technicalCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  techItem: {
    paddingVertical: spacing.xs,
  },
  techLabel: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  techValue: {
    ...typography.bodySmall,
    fontFamily: 'monospace',
    color: colors.textSecondary,
  },

  // Social Card
  socialCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  socialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  socialIcon: {
    marginRight: spacing.sm,
  },
  socialText: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  // Action Buttons
  divider: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.border,
  },
  actionButtons: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  actionButton: {
    ...components.primaryButton,
  },
});
