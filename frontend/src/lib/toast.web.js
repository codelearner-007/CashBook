import { Alert } from 'react-native';

// Web stub: must be a function so <Toast /> is valid JSX.
// Static .show() matches the react-native-toast-message API.
function Toast() { return null; }

Toast.show = function ({ text1 = '', text2 = '' } = {}) {
  Alert.alert(text1, text2 || undefined);
};

export default Toast;
