import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, Share } from 'react-native';
import {
  Text,
  Card,
  Button,
  List,
  Switch,
  Divider,
  Avatar,
  Chip,
} from 'react-native-paper';

import { AppSnackbar } from '../components/ui/AppSnackbar';
import { useSnackbar } from '../hooks/useSnackbar';
import { apiService } from '../services/api';
import { twitterService } from '../services/twitterService';
import { useAuthorization } from '../utils/useAuthorization';
import { useMobileWallet } from '../utils/useMobileWallet';
import { VaultKeyManager } from '../utils/vaultKey';

interface UserProfile {
  wallet: string;
  displayName?: string;
  email?: string;
  privyConnected: boolean;
  socialAccounts: {
    twitter?: string;
    instagram?: string;
  };
  settings: {
    notifications: boolean;
    publicProfile: boolean;
    autoReveal: boolean;
    mockTwitterApi: boolean;
  };
}

export function ProfileScreen() {
  const { snackbar, showSuccess, showError, showInfo, hideSnackbar } =
    useSnackbar();

  const { selectedAccount } = useAuthorization();
  const { disconnect } = useMobileWallet();
  const [profile, setProfile] = useState<UserProfile>({
    wallet: selectedAccount?.address || '',
    displayName: 'CapsuleUser',
    email: undefined,
    privyConnected: false,
    socialAccounts: {},
    settings: {
      notifications: true,
      publicProfile: false,
      autoReveal: true,
      mockTwitterApi: false,
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTwitterConnecting, setIsTwitterConnecting] = useState(false);
  const [vaultKeyExists, setVaultKeyExists] = useState(false);
  const [vaultKeyLoading, setVaultKeyLoading] = useState(false);

  useEffect(() => {
    checkTwitterConnection();
    loadAppSettings();
    checkVaultKeyStatus();
  }, []);

  // Re-check vault key status when wallet changes (sign in/out)
  useEffect(() => {
    checkVaultKeyStatus();
  }, [selectedAccount]);

  const loadAppSettings = async () => {
    try {
      const response = await apiService.get('/social/settings');
      if (response?.success) {
        setProfile(prev => ({
          ...prev,
          settings: {
            ...prev.settings,
            mockTwitterApi: (response.data as any).mock_twitter_api,
          },
        }));
      }
    } catch (error) {
      console.error('Failed to load app settings:', error);
    }
  };

  const checkTwitterConnection = async () => {
    try {
      const connected = await twitterService.isTwitterConnected();
      if (connected) {
        const connectionInfo = await twitterService.getTwitterConnection();
        setProfile(prev => ({
          ...prev,
          socialAccounts: {
            ...prev.socialAccounts,
            twitter: connectionInfo?.platform_username
              ? `@${connectionInfo.platform_username}`
              : '@connected',
          },
        }));
      }
    } catch (error) {
      console.error('Failed to check Twitter connection:', error);
    }
  };

  const checkVaultKeyStatus = async () => {
    if (!selectedAccount?.address) {
      setVaultKeyExists(false);
      return;
    }

    try {
      console.log('🔍 Checking vault key status for:', selectedAccount.address);
      const exists = await VaultKeyManager.hasVaultKey(selectedAccount.address);
      console.log('🔑 Vault key exists:', exists);
      setVaultKeyExists(exists);
    } catch (error) {
      console.error('Failed to check vault key status:', error);
      setVaultKeyExists(false); // Default to false on error
    }
  };

  const handleConnectPrivy = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement Privy connection
      Alert.alert(
        'Privy Integration',
        'This will connect your Privy account for enhanced features'
      );

      // Mock connection
      setTimeout(() => {
        setProfile(prev => ({
          ...prev,
          privyConnected: true,
          email: 'user@example.com',
        }));
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error connecting Privy:', error);
      Alert.alert('Error', 'Failed to connect Privy account');
      setIsLoading(false);
    }
  };

  const handleDisconnectPrivy = () => {
    showInfo('Are you sure you want to disconnect your Privy account?');
    setProfile(prev => ({
      ...prev,
      privyConnected: false,
      email: undefined,
    }));
  };

  const handleConnectTwitter = async () => {
    try {
      setIsTwitterConnecting(true);
      await twitterService.authenticate();

      // Refresh connection status
      await checkTwitterConnection();

      showSuccess('Twitter account connected successfully!');
    } catch (error) {
      console.error('Twitter connection failed:', error);
      showError('Failed to connect Twitter account. Please try again.');
    } finally {
      setIsTwitterConnecting(false);
    }
  };

  const handleConnectSocial = (platform: 'twitter' | 'instagram') => {
    if (platform === 'twitter') {
      handleConnectTwitter();
    } else {
      Alert.alert(
        `Connect ${platform}`,
        `This will connect your ${platform} account for posting capsules`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Connect',
            onPress: () => {
              // TODO: Implement Instagram connection
              setProfile(prev => ({
                ...prev,
                socialAccounts: {
                  ...prev.socialAccounts,
                  [platform]: `@user_${platform}`,
                },
              }));
            },
          },
        ]
      );
    }
  };

  const handleDisconnectSocial = (platform: 'twitter' | 'instagram') => {
    Alert.alert(
      `Disconnect ${platform}`,
      `Are you sure you want to disconnect your ${platform} account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            setProfile(prev => ({
              ...prev,
              socialAccounts: {
                ...prev.socialAccounts,
                [platform]: undefined,
              },
            }));
          },
        },
      ]
    );
  };

  const handleDisconnectWallet = () => {
    Alert.alert(
      'Disconnect Wallet',
      'Are you sure you want to disconnect your wallet? This will log you out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            disconnect();
          },
        },
      ]
    );
  };

  const handleCreateVaultKey = async () => {
    if (!selectedAccount?.address) {
      showError('No wallet connected');
      return;
    }

    Alert.alert(
      'Create Vault Key',
      'This will create a new encryption key on your device to secure your time capsule content. The key will be stored securely and can be backed up.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async () => {
            try {
              setVaultKeyLoading(true);
              await VaultKeyManager.generateVaultKey(selectedAccount.address);

              // Force refresh the vault key status
              await checkVaultKeyStatus();

              showSuccess(
                'Vault key created successfully! Your content will now be encrypted.'
              );
            } catch (error) {
              console.error('Failed to create vault key:', error);
              showError('Failed to create vault key');
            } finally {
              setVaultKeyLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleBackupVaultKey = async () => {
    if (!selectedAccount?.address) {
      showError('No wallet connected');
      return;
    }

    try {
      setVaultKeyLoading(true);
      const backupData = await VaultKeyManager.exportVaultKey(
        selectedAccount.address
      );

      Alert.alert(
        'Backup Vault Key',
        "Choose how you want to back up your vault key. Keep this backup safe - you'll need it to decrypt your content if you lose access to this device.",
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Share Backup',
            onPress: async () => {
              try {
                await Share.share({
                  message: `CapsuleX Vault Key Backup\n\nWallet: ${selectedAccount.address}\nBackup Data: ${backupData}\n\n⚠️ Keep this backup secure and private!`,
                  title: 'CapsuleX Vault Key Backup',
                });
              } catch (error) {
                console.error('Failed to share backup:', error);
                showError('Failed to share backup');
              }
            },
          },
          {
            text: 'Copy to Clipboard',
            onPress: async () => {
              // TODO: Copy to clipboard when @react-native-clipboard/clipboard is available
              Alert.alert(
                'Backup Data',
                `Wallet: ${selectedAccount.address}\n\nBackup: ${backupData}\n\n⚠️ Save this information securely!`,
                [{ text: 'OK' }]
              );
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to backup vault key:', error);
      showError('Failed to create backup');
    } finally {
      setVaultKeyLoading(false);
    }
  };

  const handleRestoreVaultKey = async () => {
    Alert.alert(
      'Restore Vault Key',
      'Enter your vault key backup data to restore access to your encrypted content.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enter Backup',
          onPress: () => {
            // TODO: Implement input dialog for backup data
            Alert.alert(
              'Restore Key',
              'This feature requires a text input dialog. For now, please contact support to restore your vault key.',
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };

  const handleDeleteVaultKey = async () => {
    if (!selectedAccount?.address) {
      showError('No wallet connected');
      return;
    }

    Alert.alert(
      'Delete Vault Key',
      '⚠️ WARNING: This will permanently delete your vault key from this device. You will lose access to all encrypted content unless you have a backup. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setVaultKeyLoading(true);
              await VaultKeyManager.deleteVaultKey(selectedAccount.address);

              // Force refresh the vault key status
              await checkVaultKeyStatus();

              showInfo(
                'Vault key deleted. Create a new key to encrypt future content.'
              );
            } catch (error) {
              console.error('Failed to delete vault key:', error);
              showError('Failed to delete vault key');
            } finally {
              setVaultKeyLoading(false);
            }
          },
        },
      ]
    );
  };

  const updateSetting = async (
    key: keyof UserProfile['settings'],
    value: boolean
  ) => {
    // Update local state immediately
    setProfile(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value,
      },
    }));

    // If updating mockTwitterApi, sync with backend
    if (key === 'mockTwitterApi') {
      try {
        const response = await apiService.post('/social/settings', {
          mock_twitter_api: value,
        });

        if (response.success) {
          showSuccess(
            value ? 'Twitter mock mode enabled' : 'Twitter mock mode disabled'
          );
        }
      } catch (error) {
        console.error('Failed to update mock Twitter setting:', error);
        showError('Failed to update Twitter mock setting');
      }
    }
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!selectedAccount) {
    return (
      <View style={styles.screenContainer}>
        <View style={styles.connectPrompt}>
          <Text variant="headlineMedium" style={styles.title}>
            Connect Your Wallet
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Connect your wallet to access your profile and settings
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <ScrollView style={styles.scrollView}>
        {/* Profile Header */}
        <Card style={styles.profileCard}>
          <Card.Content>
            <View style={styles.profileHeader}>
              <Avatar.Text
                size={64}
                label={profile.displayName?.charAt(0) || '?'}
                style={styles.avatar}
              />
              <View style={styles.profileInfo}>
                <Text variant="headlineSmall" style={styles.displayName}>
                  {profile.displayName || 'Unnamed User'}
                </Text>
                <Text variant="bodyMedium" style={styles.walletAddress}>
                  {formatWalletAddress(profile.wallet)}
                </Text>
                {profile.email && (
                  <Text variant="bodySmall" style={styles.email}>
                    {profile.email}
                  </Text>
                )}
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Account Connections */}
        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Account Connections
            </Text>

            {/* Privy Connection */}
            <List.Item
              title="Privy Account"
              description={
                profile.privyConnected
                  ? 'Connected'
                  : 'Enhanced wallet features'
              }
              left={props => <List.Icon {...props} icon="shield-account" />}
              right={() => (
                <Button
                  mode={profile.privyConnected ? 'outlined' : 'contained'}
                  onPress={
                    profile.privyConnected
                      ? handleDisconnectPrivy
                      : handleConnectPrivy
                  }
                  loading={isLoading}
                  disabled={isLoading}
                  compact
                >
                  {profile.privyConnected ? 'Disconnect' : 'Connect'}
                </Button>
              )}
            />

            <Divider />

            {/* Twitter Connection */}
            <List.Item
              title="Twitter"
              description={
                profile.socialAccounts.twitter || 'Post capsules to Twitter'
              }
              left={props => <List.Icon {...props} icon="twitter" />}
              right={() => (
                <Button
                  mode={
                    profile.socialAccounts.twitter ? 'outlined' : 'contained'
                  }
                  onPress={() =>
                    profile.socialAccounts.twitter
                      ? handleDisconnectSocial('twitter')
                      : handleConnectSocial('twitter')
                  }
                  loading={isTwitterConnecting}
                  disabled={isTwitterConnecting}
                  compact
                >
                  {isTwitterConnecting
                    ? 'Connecting...'
                    : profile.socialAccounts.twitter
                      ? 'Reconnect'
                      : 'Connect'}
                </Button>
              )}
            />

            <Divider />

            {/* Instagram Connection */}
            <List.Item
              title="Instagram"
              description={
                profile.socialAccounts.instagram || 'Post capsules to Instagram'
              }
              left={props => <List.Icon {...props} icon="instagram" />}
              right={() => (
                <Button
                  mode={
                    profile.socialAccounts.instagram ? 'outlined' : 'contained'
                  }
                  onPress={() =>
                    profile.socialAccounts.instagram
                      ? handleDisconnectSocial('instagram')
                      : handleConnectSocial('instagram')
                  }
                  compact
                >
                  {profile.socialAccounts.instagram ? 'Disconnect' : 'Connect'}
                </Button>
              )}
            />
          </Card.Content>
        </Card>

        {/* Settings */}
        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Settings
            </Text>

            <List.Item
              title="Push Notifications"
              description="Get notified when capsules are revealed"
              left={props => <List.Icon {...props} icon="bell" />}
              right={() => (
                <Switch
                  value={profile.settings.notifications}
                  onValueChange={value => updateSetting('notifications', value)}
                />
              )}
            />

            <Divider />

            <List.Item
              title="Public Profile"
              description="Allow others to see your capsules"
              left={props => <List.Icon {...props} icon="earth" />}
              right={() => (
                <Switch
                  value={profile.settings.publicProfile}
                  onValueChange={value => updateSetting('publicProfile', value)}
                />
              )}
            />

            <Divider />

            <List.Item
              title="Auto-Reveal"
              description="Automatically post capsules when time comes"
              left={props => <List.Icon {...props} icon="clock-time-four" />}
              right={() => (
                <Switch
                  value={profile.settings.autoReveal}
                  onValueChange={value => updateSetting('autoReveal', value)}
                />
              )}
            />

            <Divider />

            <List.Item
              title="Mock Twitter API"
              description="Use mock Twitter posting for development/demos"
              left={props => <List.Icon {...props} icon="api" />}
              right={() => (
                <Switch
                  value={profile.settings.mockTwitterApi}
                  onValueChange={value =>
                    updateSetting('mockTwitterApi', value)
                  }
                />
              )}
            />
          </Card.Content>
        </Card>

        {/* Wallet Management */}
        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Wallet Management
            </Text>

            <List.Item
              title="SOL Balance"
              description="0.0124 SOL (~$1.18)"
              left={props => <List.Icon {...props} icon="wallet" />}
              right={() => (
                <Button
                  mode="outlined"
                  onPress={() => {
                    // TODO: Navigate to wallet details or buy SOL
                    showInfo(
                      'This will show wallet details and buy SOL options'
                    );
                  }}
                  compact
                >
                  Manage
                </Button>
              )}
            />

            <Divider />

            <List.Item
              title="Transaction History"
              description="View your capsule creation history"
              left={props => <List.Icon {...props} icon="history" />}
              right={() => (
                <Button
                  mode="outlined"
                  onPress={() => {
                    // TODO: Navigate to transaction history
                    Alert.alert(
                      'Transaction History',
                      'This will show your transaction history'
                    );
                  }}
                  compact
                >
                  View
                </Button>
              )}
            />

            <Divider />

            <List.Item
              title="Disconnect Wallet"
              description="Sign out and disconnect your wallet"
              left={props => <List.Icon {...props} icon="logout" />}
              right={() => (
                <Button
                  mode="outlined"
                  onPress={handleDisconnectWallet}
                  compact
                  textColor="#FF5722"
                >
                  Disconnect
                </Button>
              )}
            />
          </Card.Content>
        </Card>

        {/* Vault Key Management */}
        <Card style={styles.section}>
          <Card.Content>
            <View style={styles.sectionHeaderWithStatus}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Vault Key Management
              </Text>
              <Chip
                style={[
                  styles.statusChip,
                  { backgroundColor: vaultKeyExists ? '#4CAF50' : '#FF9800' },
                ]}
                textStyle={{ color: 'white', fontSize: 12 }}
              >
                {vaultKeyExists ? 'Active' : 'Not Set'}
              </Chip>
            </View>

            <Text variant="bodySmall" style={styles.sectionDescription}>
              Your vault key encrypts time capsule content on your device. This
              key is required to decrypt your own content.
            </Text>

            {vaultKeyExists ? (
              <>
                <List.Item
                  title="Vault Key Status"
                  description="Your device has an active vault key for encryption"
                  left={props => <List.Icon {...props} icon="shield-check" />}
                  right={() => (
                    <Chip
                      style={styles.activeChip}
                      textStyle={{ color: 'white' }}
                    >
                      ✓ Active
                    </Chip>
                  )}
                />

                <Divider />

                <List.Item
                  title="Backup Vault Key"
                  description="Create a secure backup of your encryption key"
                  left={props => <List.Icon {...props} icon="backup-restore" />}
                  right={() => (
                    <Button
                      mode="outlined"
                      onPress={handleBackupVaultKey}
                      loading={vaultKeyLoading}
                      disabled={vaultKeyLoading}
                      compact
                    >
                      Backup
                    </Button>
                  )}
                />

                <Divider />

                <List.Item
                  title="Delete Vault Key"
                  description="⚠️ Permanently remove key from this device"
                  left={props => <List.Icon {...props} icon="delete-forever" />}
                  right={() => (
                    <Button
                      mode="outlined"
                      onPress={handleDeleteVaultKey}
                      loading={vaultKeyLoading}
                      disabled={vaultKeyLoading}
                      compact
                      textColor="#FF5722"
                    >
                      Delete
                    </Button>
                  )}
                />
              </>
            ) : (
              <>
                <List.Item
                  title="No Vault Key"
                  description="Create a vault key to encrypt your time capsule content"
                  left={props => <List.Icon {...props} icon="shield-alert" />}
                  right={() => (
                    <Chip
                      style={styles.warningChip}
                      textStyle={{ color: 'white' }}
                    >
                      ⚠️ Not Set
                    </Chip>
                  )}
                />

                <Divider />

                <List.Item
                  title="Create Vault Key"
                  description="Generate a new encryption key for your content"
                  left={props => <List.Icon {...props} icon="shield-plus" />}
                  right={() => (
                    <Button
                      mode="contained"
                      onPress={handleCreateVaultKey}
                      loading={vaultKeyLoading}
                      disabled={vaultKeyLoading}
                      compact
                    >
                      Create
                    </Button>
                  )}
                />

                <Divider />

                <List.Item
                  title="Restore Vault Key"
                  description="Restore from a previous backup"
                  left={props => <List.Icon {...props} icon="backup-restore" />}
                  right={() => (
                    <Button
                      mode="outlined"
                      onPress={handleRestoreVaultKey}
                      loading={vaultKeyLoading}
                      disabled={vaultKeyLoading}
                      compact
                    >
                      Restore
                    </Button>
                  )}
                />
              </>
            )}
          </Card.Content>
        </Card>

        {/* App Info */}
        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              About
            </Text>

            <List.Item
              title="Version"
              description="1.0.0"
              left={props => <List.Icon {...props} icon="information" />}
            />

            <Divider />

            <List.Item
              title="Privacy Policy"
              description="Learn how we protect your data"
              left={props => <List.Icon {...props} icon="shield-lock" />}
              right={() => (
                <Button
                  mode="outlined"
                  onPress={() => {
                    // TODO: Open privacy policy
                    Alert.alert(
                      'Privacy Policy',
                      'This will open the privacy policy'
                    );
                  }}
                  compact
                >
                  View
                </Button>
              )}
            />

            <Divider />

            <List.Item
              title="Terms of Service"
              description="Read our terms of service"
              left={props => <List.Icon {...props} icon="file-document" />}
              right={() => (
                <Button
                  mode="outlined"
                  onPress={() => {
                    // TODO: Open terms of service
                    Alert.alert(
                      'Terms of Service',
                      'This will open the terms of service'
                    );
                  }}
                  compact
                >
                  View
                </Button>
              )}
            />
          </Card.Content>
        </Card>
      </ScrollView>

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
  connectPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
  },
  profileCard: {
    margin: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#2196F3',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  displayName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  walletAddress: {
    color: '#666',
    fontFamily: 'monospace',
    fontSize: 14,
  },
  email: {
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionHeaderWithStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionDescription: {
    color: '#666',
    marginBottom: 16,
    lineHeight: 18,
  },
  statusChip: {
    borderRadius: 12,
  },
  activeChip: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
  },
  warningChip: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
  },
});
