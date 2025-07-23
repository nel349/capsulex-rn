import type { RouteProp } from '@react-navigation/native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import {
  Text,
  Card,
  IconButton,
  Button,
  Chip,
  Divider,
} from 'react-native-paper';

import { AppSnackbar } from '../components/ui/AppSnackbar';
import { useSnackbar } from '../hooks/useSnackbar';
import type { CapsuleWithStatus } from '../services/capsuleApi';
import type { Capsule } from '../types/api';
import { useAuthorization } from '../utils/useAuthorization';
import { VaultKeyManager } from '../utils/vaultKey';

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

  const { selectedAccount } = useAuthorization();
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
    if (!selectedAccount) {
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
      if (encryptedContent.walletAddress !== selectedAccount.address) {
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
        selectedAccount.address
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
        return '#4CAF50';
      case 'ready_to_reveal':
        return '#FF9800';
      default:
        return '#2196F3';
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

  // Show loading state while processing data
  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Text>Loading capsule details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Text variant="headlineSmall" style={styles.title}>
                Time Capsule Details
              </Text>
              <Chip
                style={[
                  styles.statusChip,
                  { backgroundColor: getStatusColor(fullCapsuleData?.status) },
                ]}
                textStyle={{ color: 'white' }}
              >
                {getStatusText(fullCapsuleData?.status)}
              </Chip>
            </View>
            <Text variant="bodyMedium" style={styles.capsuleId}>
              ID:{' '}
              {fullCapsuleData?.capsule_id ||
                capsule.publicKey.slice(0, 8) + '...'}
            </Text>
          </Card.Content>
        </Card>

        {/* Encrypted Content Card */}
        <Card style={styles.contentCard}>
          <Card.Content>
            <View style={styles.contentHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Encrypted Content
              </Text>
              <IconButton
                icon={showContent ? 'eye-off' : 'eye'}
                size={24}
                onPress={handleDecryptContent}
                disabled={isDecrypting || !fullCapsuleData?.content_encrypted}
                style={styles.eyeButton}
              />
            </View>

            <View style={styles.contentArea}>
              {showContent && decryptedContent ? (
                <Text variant="bodyLarge" style={styles.decryptedText}>
                  {decryptedContent}
                </Text>
              ) : (
                <Text variant="bodyMedium" style={styles.encryptedText}>
                  {isDecrypting
                    ? 'Decrypting...'
                    : fullCapsuleData?.content_encrypted
                      ? '🔒 Content is encrypted with your device vault key. Click the eye icon to decrypt and view.'
                      : '⚠️ Encrypted content not available. This capsule may have been created with an older system.'}
                </Text>
              )}
            </View>

            {selectedAccount?.address && (
              <Text variant="bodySmall" style={styles.walletInfo}>
                Wallet: {selectedAccount?.address?.slice(0, 8)}...
                {selectedAccount?.address?.slice(-8)}
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Timeline Card */}
        <Card style={styles.timelineCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Timeline
            </Text>

            <View style={styles.timelineItem}>
              <Text variant="bodyMedium" style={styles.timelineLabel}>
                Created:
              </Text>
              <Text variant="bodyMedium">
                {fullCapsuleData
                  ? new Date(fullCapsuleData.created_at).toLocaleString()
                  : new Date(capsule.account.createdAt * 1000).toLocaleString()}
              </Text>
            </View>

            <View style={styles.timelineItem}>
              <Text variant="bodyMedium" style={styles.timelineLabel}>
                Reveal Date:
              </Text>
              <Text
                variant="bodyMedium"
                style={[
                  styles.revealDate,
                  { color: isRevealed ? '#4CAF50' : '#FF9800' },
                ]}
              >
                {fullCapsuleData
                  ? new Date(fullCapsuleData.reveal_date).toLocaleString()
                  : new Date(
                      capsule.account.revealDate * 1000
                    ).toLocaleString()}
                {isRevealed ? ' ✅' : ' ⏳'}
              </Text>
            </View>

            {fullCapsuleData?.revealed_at && (
              <View style={styles.timelineItem}>
                <Text variant="bodyMedium" style={styles.timelineLabel}>
                  Revealed:
                </Text>
                <Text variant="bodyMedium">
                  {new Date(fullCapsuleData?.revealed_at!).toLocaleString()}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Technical Details Card */}
        <Card style={styles.technicalCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Technical Details
            </Text>

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
                {fullCapsuleData?.sol_fee_amount || '0.00005'} SOL
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
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Social Sharing
              </Text>

              <View style={styles.socialItem}>
                <Text variant="bodyMedium">Posted to Social: ✅</Text>
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
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
  },
  statusChip: {
    marginLeft: 8,
  },
  capsuleId: {
    color: '#666',
    fontFamily: 'monospace',
  },
  contentCard: {
    margin: 16,
    marginVertical: 8,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  eyeButton: {
    margin: 0,
  },
  disabledButton: {
    opacity: 0.3,
  },
  contentArea: {
    minHeight: 80,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  decryptedText: {
    lineHeight: 24,
  },
  encryptedText: {
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
  },
  walletInfo: {
    color: '#666',
    fontFamily: 'monospace',
  },
  timelineCard: {
    margin: 16,
    marginVertical: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  timelineLabel: {
    fontWeight: '500',
    flex: 1,
  },
  revealDate: {
    flex: 2,
    textAlign: 'right',
    fontWeight: '500',
  },
  technicalCard: {
    margin: 16,
    marginVertical: 8,
  },
  techItem: {
    paddingVertical: 4,
  },
  techLabel: {
    fontWeight: '500',
    marginBottom: 2,
  },
  techValue: {
    fontFamily: 'monospace',
    color: '#666',
  },
  socialCard: {
    margin: 16,
    marginVertical: 8,
  },
  socialItem: {
    paddingVertical: 4,
  },
  divider: {
    margin: 16,
    marginVertical: 8,
  },
  actionButtons: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    marginVertical: 4,
  },
});
