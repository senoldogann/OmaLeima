import * as SecureStore from "expo-secure-store";

const mobileRoleAreaPreferenceKey = "mobile-role-area-preference";

export type MobileRoleArea = "student" | "business" | "club";

export const isMobileRoleArea = (value: unknown): value is MobileRoleArea =>
  value === "student" || value === "business" || value === "club";

export const getPreferredMobileRoleAreaAsync = async (): Promise<MobileRoleArea | null> => {
  const storedArea = await SecureStore.getItemAsync(mobileRoleAreaPreferenceKey);

  return isMobileRoleArea(storedArea) ? storedArea : null;
};

export const setPreferredMobileRoleAreaAsync = async (area: MobileRoleArea): Promise<void> => {
  await SecureStore.setItemAsync(mobileRoleAreaPreferenceKey, area);
};

export const clearPreferredMobileRoleAreaAsync = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(mobileRoleAreaPreferenceKey);
};
