import { deviceStorage } from "@/lib/device-storage";

const mobileRoleAreaPreferenceKey = "mobile-role-area-preference";

export type MobileRoleArea = "student" | "business" | "club";

export const isMobileRoleArea = (value: unknown): value is MobileRoleArea =>
  value === "student" || value === "business" || value === "club";

export const getPreferredMobileRoleAreaAsync = async (): Promise<MobileRoleArea | null> => {
  const storedArea = await deviceStorage.getItemAsync(mobileRoleAreaPreferenceKey);

  return isMobileRoleArea(storedArea) ? storedArea : null;
};

export const setPreferredMobileRoleAreaAsync = async (area: MobileRoleArea): Promise<void> => {
  await deviceStorage.setItemAsync(mobileRoleAreaPreferenceKey, area);
};

export const clearPreferredMobileRoleAreaAsync = async (): Promise<void> => {
  await deviceStorage.deleteItemAsync(mobileRoleAreaPreferenceKey);
};
