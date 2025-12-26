import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Gear, House, Sparkle } from 'phosphor-react-native';

import { colors } from '@/constants/palette';
import { shadows } from '@/constants/shadows';

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
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    overflow: 'hidden', 
    ...shadows.dock,
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
    ...shadows.glowImperial,
  },
  dockButtonAi: {
    backgroundColor: colors.gold50,
    ...shadows.glowGold,
  },
  dockButtonSettings: {
    backgroundColor: colors.stone100,
    ...shadows.glowStone,
  },
});
