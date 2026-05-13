import { useRouter } from 'expo-router';
import NotificationInbox from '../components/notifications/NotificationInbox';

export default function NotificationsScreen() {
  const router = useRouter();
  return (
    <NotificationInbox
      showBack
      onBack={() => router.canGoBack() ? router.back() : router.replace('/(app)/settings')}
      emptySubtitle="You're all caught up! Notifications from your admin will appear here."
    />
  );
}
