import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text, Card, FAB, IconButton, Chip } from 'react-native-paper';

import { useAuthorization } from '../utils/useAuthorization';
import { SolanaService } from '../services/solana';
import { Address } from '@solana/kit';

interface Capsule {
  id: string;
  content: string;
  revealDate: Date;
  status: 'pending' | 'revealed';
  platform: 'twitter' | 'instagram';
  createdAt: Date;
}

export function HubScreen() {
  const { selectedAccount } = useAuthorization();
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalCapsules: 0,
    pendingCapsules: 0,
    nextReveal: null as Date | null,
  });
  const [solBalance, setSolBalance] = useState<number | null>(null);

  // use effect to fetch solana balance
  useEffect(() => {
    if (selectedAccount) {
      const fetchSolanaBalance = async () => {
        const balance = await new SolanaService().getBalance(selectedAccount.publicKey.toString() as Address);
        setSolBalance(balance);
      };
      fetchSolanaBalance();
    }
  }, [selectedAccount]);

  // Mock data for now
  useEffect(() => {
    const mockCapsules: Capsule[] = [
      {
        id: '1',
        content:
          'Just launched my new project! So excited to share this with the world 🚀',
        revealDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        status: 'pending',
        platform: 'twitter',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        id: '2',
        content: "Behind the scenes from today's photoshoot ✨",
        revealDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        status: 'pending',
        platform: 'instagram',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      {
        id: '3',
        content:
          'Reflecting on this amazing journey. Thank you all for your support! 🙏',
        revealDate: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        status: 'revealed',
        platform: 'twitter',
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      },
    ];

    setCapsules(mockCapsules);

    const pending = mockCapsules.filter(c => c.status === 'pending');
    const nextReveal =
      pending.length > 0
        ? pending.reduce((earliest, current) =>
            earliest.revealDate < current.revealDate ? earliest : current
          ).revealDate
        : null;

    setStats({
      totalCapsules: mockCapsules.length,
      pendingCapsules: pending.length,
      nextReveal,
    });
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch real data from backend
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const formatTimeUntil = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return 'Revealed';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0)
      return `${hours}h ${Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))}m`;
    return `${Math.floor(diff / (1000 * 60))}m`;
  };

  const handleCreateCapsule = () => {
    // TODO: Navigate to create capsule screen
    Alert.alert('Create Capsule', 'Navigate to capsule creation screen');
  };

  if (!selectedAccount) {
    return (
      <View style={styles.screenContainer}>
        <Text variant="headlineMedium" style={styles.title}>
          Welcome to CapsuleX
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Connect your wallet to start creating time capsules
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Your Capsules
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {stats.pendingCapsules} pending • {stats.totalCapsules} total
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="labelLarge" style={styles.statLabel}>
                Next Reveal
              </Text>
              <Text variant="headlineSmall" style={styles.statValue}>
                {stats.nextReveal ? formatTimeUntil(stats.nextReveal) : 'None'}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="labelLarge" style={styles.statLabel}>
                SOL Balance
              </Text>
              <Text variant="headlineSmall" style={styles.statValue}>
                {solBalance !== null ? `${solBalance.toFixed(4)} SOL` : 'N/A'}
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Capsule List */}
        <View style={styles.capsulesContainer}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Recent Capsules
          </Text>

          {capsules.map(capsule => (
            <Card key={capsule.id} style={styles.capsuleCard}>
              <Card.Content>
                <View style={styles.capsuleHeader}>
                  <Chip
                    mode="outlined"
                    style={[
                      styles.statusChip,
                      capsule.status === 'pending'
                        ? styles.pendingChip
                        : styles.revealedChip,
                    ]}
                  >
                    {capsule.status === 'pending' ? 'Pending' : 'Revealed'}
                  </Chip>
                  <Text variant="bodySmall" style={styles.platform}>
                    {capsule.platform}
                  </Text>
                </View>

                <Text variant="bodyMedium" style={styles.capsuleContent}>
                  {capsule.content}
                </Text>

                <View style={styles.capsuleFooter}>
                  <Text variant="bodySmall" style={styles.revealTime}>
                    {capsule.status === 'pending'
                      ? `Reveals in ${formatTimeUntil(capsule.revealDate)}`
                      : `Revealed ${formatTimeUntil(capsule.revealDate)} ago`}
                  </Text>
                  <IconButton
                    icon="dots-vertical"
                    size={16}
                    onPress={() => {
                      // TODO: Show capsule options
                    }}
                  />
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>

        {/* Empty State */}
        {capsules.length === 0 && (
          <View style={styles.emptyState}>
            <Text variant="headlineSmall" style={styles.emptyTitle}>
              No capsules yet
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
              Create your first time capsule to get started
            </Text>
          </View>
        )}
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
    backgroundColor: '#f5f5f5',
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
  },
  statLabel: {
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  capsulesContainer: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  capsuleCard: {
    marginBottom: 12,
  },
  capsuleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  pendingChip: {
    backgroundColor: '#FFF3E0',
  },
  revealedChip: {
    backgroundColor: '#E8F5E8',
  },
  platform: {
    color: '#666',
    textTransform: 'capitalize',
  },
  capsuleContent: {
    marginBottom: 12,
    lineHeight: 20,
  },
  capsuleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revealTime: {
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#2196F3',
  },
});
