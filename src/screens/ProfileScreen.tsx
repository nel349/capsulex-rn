import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  List,
  Switch,
  Divider,
  Avatar,
} from 'react-native-paper';

import { useAuthorization } from '../utils/useAuthorization';
import { useMobileWallet } from '../utils/useMobileWallet';

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
  };
}

export function ProfileScreen() {
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
    },
  });
  const [isLoading, setIsLoading] = useState(false);

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
    Alert.alert(
      'Disconnect Privy',
      'Are you sure you want to disconnect your Privy account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            setProfile(prev => ({
              ...prev,
              privyConnected: false,
              email: undefined,
            }));
          },
        },
      ]
    );
  };

  const handleConnectSocial = (platform: 'twitter' | 'instagram') => {
    Alert.alert(
      `Connect ${platform}`,
      `This will connect your ${platform} account for posting capsules`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Connect',
          onPress: () => {
            // TODO: Implement social media connection
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

  const updateSetting = (
    key: keyof UserProfile['settings'],
    value: boolean
  ) => {
    setProfile(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value,
      },
    }));
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
                  compact
                >
                  {profile.socialAccounts.twitter ? 'Disconnect' : 'Connect'}
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
                    Alert.alert(
                      'SOL Balance',
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
});
