import { deviceStorage } from "@/lib/device-storage";

const businessOnboardingVersion = "v1";

const createBusinessOnboardingStoreKey = (userId: string): string =>
  `omaleima.business.onboarding.${businessOnboardingVersion}.${userId}`;

export const readBusinessOnboardingSeenAsync = async (userId: string): Promise<boolean> => {
  const rawValue = await deviceStorage.getItemAsync(createBusinessOnboardingStoreKey(userId));

  return rawValue === businessOnboardingVersion;
};

export const markBusinessOnboardingSeenAsync = async (userId: string): Promise<void> => {
  await deviceStorage.setItemAsync(createBusinessOnboardingStoreKey(userId), businessOnboardingVersion);
};
