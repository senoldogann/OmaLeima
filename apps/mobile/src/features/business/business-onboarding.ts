import * as SecureStore from "expo-secure-store";

const businessOnboardingVersion = "v1";

const createBusinessOnboardingStoreKey = (userId: string): string =>
  `omaleima.business.onboarding.${businessOnboardingVersion}.${userId}`;

export const readBusinessOnboardingSeenAsync = async (userId: string): Promise<boolean> => {
  const rawValue = await SecureStore.getItemAsync(createBusinessOnboardingStoreKey(userId));

  return rawValue === businessOnboardingVersion;
};

export const markBusinessOnboardingSeenAsync = async (userId: string): Promise<void> => {
  await SecureStore.setItemAsync(createBusinessOnboardingStoreKey(userId), businessOnboardingVersion);
};
