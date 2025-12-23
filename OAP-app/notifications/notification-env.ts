import Constants from 'expo-constants';

export function isExpoGo() {
  return Constants.appOwnership === 'expo';
}
