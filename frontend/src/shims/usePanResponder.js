// Web stub — react-native-toast-message uses PanResponder for swipe-to-dismiss,
// which doesn't exist on web. Return no-op pan handlers.
export const usePanResponder = () => ({ panHandlers: {} });
export default usePanResponder;
