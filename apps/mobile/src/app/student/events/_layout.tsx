import { Stack } from "expo-router";

export default function StudentEventsStackLayout() {
  return (
    <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[eventId]" />
    </Stack>
  );
}
