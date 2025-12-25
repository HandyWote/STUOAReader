import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Gear, House, Sparkle } from 'phosphor-react-native';

import { colors } from '@/constants/palette';

type DockTab = 'home' | 'ai' | 'settings';

type BottomDockProps = {
  activeTab: DockTab;
  onHome: () => void;
  onAi: () => void;
  onSettings: () => void;
};

export function BottomDock({ activeTab, onHome, onAi, onSettings }: BottomDockProps) {
  const activeStyle =
    activeTab === 'home'
      ? styles.dockButtonHome
      : activeTab === 'ai'
        ? styles.dockButtonAi
        : styles.dockButtonSettings;

  return (
    <View style={styles.dockWrap}>
      <BlurView intensity={60} tint="light" style={styles.dock}>
        <Pressable
          style={[styles.dockButton, activeTab === 'home' && activeStyle]}
          onPress={onHome}
        >
          <House
            size={22}
            color={activeTab === 'home' ? colors.imperial600 : colors.stone400}
            weight={activeTab === 'home' ? 'fill' : 'bold'}
          />
        </Pressable>
        <Pressable
          style={[styles.dockButton, activeTab === 'ai' && activeStyle]}
          onPress={onAi}
        >
          <Sparkle
            size={22}
            color={activeTab === 'ai' ? colors.gold500 : colors.stone400}
            weight={activeTab === 'ai' ? 'fill' : 'bold'}
          />
        </Pressable>
        <Pressable
          style={[styles.dockButton, activeTab === 'settings' && activeStyle]}
          onPress={onSettings}
        >
          <Gear
            size={22}
            color={activeTab === 'settings' ? colors.stone800 : colors.stone400}
            weight={activeTab === 'settings' ? 'fill' : 'bold'}
          />
        </Pressable>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  dockWrap: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20, 
  },
  dock: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999, 
    flexDirection: 'row',
    gap: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden', 
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  dockButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockButtonHome: {
    backgroundColor: colors.imperial50,
    ...Platform.select({
      ios: {
        shadowColor: colors.imperial500,
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 0px 12px rgba(192, 36, 37, 0.18)',
      },
    }),
  },
  dockButtonAi: {
    backgroundColor: colors.gold50,
    ...Platform.select({
      ios: {
        shadowColor: colors.gold500,
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 0px 12px rgba(184, 134, 11, 0.15)',
      },
    }),
  },
  dockButtonSettings: {
    backgroundColor: colors.stone100,
    ...Platform.select({
      ios: {
        shadowColor: colors.stone500,
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 0px 10px rgba(107, 100, 97, 0.12)',
      },
    }),
  },
});
