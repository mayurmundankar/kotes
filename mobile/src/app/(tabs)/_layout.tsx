import { Tabs } from 'expo-router/js-tabs';

import { Nav } from '@/components/nav';
import { C } from '@/theme';

export const unstable_settings = { initialRouteName: 'feed' };

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <Nav {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.paper } }}>
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}
