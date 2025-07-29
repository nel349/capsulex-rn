import MaterialCommunityIcon from '@expo/vector-icons/MaterialCommunityIcons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { View } from 'react-native';

import { TopBar } from '../components/top-bar/top-bar-feature';
import { CreateCapsuleScreen } from '../screens/CreateCapsuleScreen';
import { DiscoverScreen } from '../screens/DiscoverScreen';
import { HubScreen } from '../screens/HubScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

/**
 * This is the main navigator with a bottom tab bar.
 * Each tab is a stack navigator with its own set of screens.
 *
 * More info: https://reactnavigation.org/docs/bottom-tab-navigator/
 */
export function HomeNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        header: () => <TopBar />,
        tabBarIcon: ({ focused, color, size }) => {
          switch (route.name) {
            case 'Hub':
              return (
                <MaterialCommunityIcon
                  name={focused ? 'home' : 'home-outline'}
                  size={size}
                  color={color}
                />
              );
            case 'Create':
              return (
                <View style={{
                  backgroundColor: focused ? 'transparent' : colors.primary + '20',
                  borderRadius: 20,
                  padding: 2,
                  borderWidth: focused ? 0 : 2,
                  borderColor: colors.primary + '40',
                }}>
                  <MaterialCommunityIcon
                    name={focused ? 'plus-circle' : 'plus-circle-outline'}
                    size={size + 1} // Slightly larger
                    color={focused ? color : colors.primary}
                  />
                </View>
              );
            case 'Discover':
              return (
                <MaterialCommunityIcon
                  name={focused ? 'earth' : 'earth'}
                  size={size}
                  color={color}
                />
              );
            case 'Leaderboards':
              return (
                <MaterialCommunityIcon
                  name={focused ? 'trophy' : 'trophy-outline'}
                  size={size}
                  color={color}
                />
              );
            case 'Profile':
              return (
                <MaterialCommunityIcon
                  name={focused ? 'account' : 'account-outline'}
                  size={size}
                  color={color}
                />
              );
          }
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      })}
    >
      <Tab.Screen
        name="Hub"
        component={HubScreen}
        options={{ tabBarLabel: 'Hub' }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{ tabBarLabel: 'Discover' }}
      />
      <Tab.Screen
        name="Create"
        component={CreateCapsuleScreen}
        options={{ tabBarLabel: 'Create' }}
      />
      <Tab.Screen
        name="Leaderboards"
        component={LeaderboardScreen}
        options={{ tabBarLabel: 'Leaderboards' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}
