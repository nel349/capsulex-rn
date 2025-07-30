import MaterialCommunityIcon from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  Share,
  Platform,
  RefreshControl,
} from 'react-native';
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
import { useDualAuth } from '../providers';
import { apiService } from '../services/api';
import { useAuthService } from '../services/authService';
import { twitterService } from '../services/twitterService';
import { colors, typography, spacing, layout, shadows } from '../theme';
import { VaultKeyManager } from '../utils/vaultKey';

type RootStackParamList = {
  NetworkSettings: undefined;
};

type ProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'NetworkSettings'
>;

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
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { snackbar, showSuccess, showError, showInfo, hideSnackbar } =
    useSnackbar();

  const { isAuthenticated, walletAddress, signOut } = useDualAuth();
  const { clearAuth } = useAuthService();
  const [profile, setProfile] = useState<UserProfile>({
    wallet: walletAddress || '',
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
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkTwitterConnection();
    loadAppSettings();
    checkVaultKeyStatus();
  }, []);

  // Re-check vault key status when wallet changes (sign in/out)
  useEffect(() => {
    checkVaultKeyStatus();
  }, [walletAddress]);

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
    if (!walletAddress) {
      setVaultKeyExists(false);
      return;
    }

    try {
      console.log('🔍 Checking vault key status for:', walletAddress);
      const exists = await VaultKeyManager.hasVaultKey(walletAddress);
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
      'Are you sure you want to disconnect your wallet? This will log you out and clear all stored authentication data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              showInfo('Disconnecting wallet...');

              // Clear JWT tokens and user data from AsyncStorage
              await clearAuth();

              // Use platform-specific signOut method
              await signOut();

              showSuccess('Wallet disconnected successfully!');
            } catch (error) {
              console.error('Error disconnecting wallet:', error);
              showError('Failed to disconnect wallet. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleCreateVaultKey = async () => {
    if (!walletAddress) {
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
              await VaultKeyManager.generateVaultKey(walletAddress);

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
    if (!walletAddress) {
      showError('No wallet connected');
      return;
    }

    try {
      setVaultKeyLoading(true);
      const backupData = await VaultKeyManager.exportVaultKey(walletAddress);

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
                  message: `CapsuleX Vault Key Backup\n\nWallet: ${walletAddress}\nBackup Data: ${backupData}\n\n⚠️ Keep this backup secure and private!`,
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
                `Wallet: ${walletAddress}\n\nBackup: ${backupData}\n\n⚠️ Save this information securely!`,
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
    if (!walletAddress) {
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
              await VaultKeyManager.deleteVaultKey(walletAddress);

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

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        checkTwitterConnection(),
        loadAppSettings(),
        checkVaultKeyStatus(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // Render hero content
  const renderHeroContent = () => (
    <>
      <View style={styles.titleContainer}>
        <MaterialCommunityIcon
          name="account-circle"
          size={32}
          color={colors.primary}
          style={styles.titleIcon}
        />
        <Text style={styles.heroTitle}>Profile</Text>
      </View>
      <View style={styles.subtitleContainer}>
        <Text style={styles.heroSubtitle}>
          <Text style={styles.highlightText}>
            {vaultKeyExists ? 'Secured' : 'Open'}
          </Text>
          <Text style={styles.subtitleText}> vault • </Text>
          <Text style={styles.highlightText}>
            {profile.socialAccounts.twitter ? 'Connected' : 'Disconnected'}
          </Text>
          <Text style={styles.subtitleText}> social</Text>
        </Text>
      </View>
      <View style={styles.heroStats}>
        <View style={styles.statItem}>
          <MaterialCommunityIcon
            name="wallet"
            size={28}
            color={colors.primary}
          />
          <Text style={styles.statValue}>
            {formatWalletAddress(profile.wallet)}
          </Text>
          <Text style={styles.statLabel}>Wallet</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcon
            name={vaultKeyExists ? 'shield-check' : 'shield-alert'}
            size={28}
            color={vaultKeyExists ? colors.success : colors.warning}
          />
          <Text style={styles.statValue}>
            {vaultKeyExists ? 'Secured' : 'Open'}
          </Text>
          <Text style={styles.statLabel}>Vault Status</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcon
            name="twitter"
            size={28}
            color={
              profile.socialAccounts.twitter
                ? colors.success
                : colors.textSecondary
            }
          />
          <Text style={styles.statValue}>
            {profile.socialAccounts.twitter ? 'Active' : 'None'}
          </Text>
          <Text style={styles.statLabel}>Social</Text>
        </View>
      </View>
    </>
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.screenContainer}>
        <View style={styles.connectPrompt}>
          <MaterialCommunityIcon
            name="wallet-outline"
            size={64}
            color={colors.primary}
            style={styles.connectIcon}
          />
          <Text variant="headlineMedium" style={styles.connectTitle}>
            Connect Your Wallet
          </Text>
          <Text variant="bodyLarge" style={styles.connectSubtitle}>
            Connect your wallet to access your profile and settings
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
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
        <Card style={styles.connectionsCard}>
          <Card.Content>
            <View style={styles.sectionTitleContainer}>
              <MaterialCommunityIcon
                name="link"
                size={20}
                color={colors.primary}
                style={styles.sectionTitleIcon}
              />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Account Connections
              </Text>
            </View>

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
        <Card style={styles.settingsCard}>
          <Card.Content>
            <View style={styles.sectionTitleContainer}>
              <MaterialCommunityIcon
                name="cog"
                size={20}
                color={colors.primary}
                style={styles.sectionTitleIcon}
              />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Settings
              </Text>
            </View>

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
              title="Network Settings"
              description="Manage blockchain network settings"
              left={props => <List.Icon {...props} icon="server" />}
              onPress={() => navigation.navigate('NetworkSettings')}
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
        <Card style={styles.walletCard}>
          <Card.Content>
            <View style={styles.sectionTitleContainer}>
              <MaterialCommunityIcon
                name="wallet"
                size={20}
                color={colors.primary}
                style={styles.sectionTitleIcon}
              />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Wallet Management
              </Text>
            </View>

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
        <Card style={styles.vaultCard}>
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
        <Card style={styles.aboutCard}>
          <Card.Content>
            <View style={styles.sectionTitleContainer}>
              <MaterialCommunityIcon
                name="information"
                size={20}
                color={colors.primary}
                style={styles.sectionTitleIcon}
              />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                About
              </Text>
            </View>

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
    ...layout.screenContainer,
  },
  scrollView: {
    flex: 1,
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

  // Connect Prompt
  connectPrompt: {
    ...layout.centered,
    ...layout.premiumSpacing,
  },
  connectIcon: {
    marginBottom: spacing.lg,
  },
  connectTitle: {
    ...typography.headlineMedium,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  connectSubtitle: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Profile Card
  profileCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: colors.primary,
    marginRight: spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  displayName: {
    ...typography.headlineSmall,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  walletAddress: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  email: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // Section Cards
  connectionsCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  settingsCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  walletCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  vaultCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderLeftWidth: 4,
    borderLeftColor: colors.premiumOrange,
  },
  aboutCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },

  // Section Headers
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitleIcon: {
    marginRight: spacing.sm,
  },
  sectionTitle: {
    ...typography.titleMedium,
    color: colors.primary,
    fontWeight: 'bold',
  },
  sectionHeaderWithStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },

  // Status Chips
  statusChip: {
    borderRadius: 12,
  },
  activeChip: {
    backgroundColor: colors.success,
    borderRadius: 12,
  },
  warningChip: {
    backgroundColor: colors.warning,
    borderRadius: 12,
  },
});
