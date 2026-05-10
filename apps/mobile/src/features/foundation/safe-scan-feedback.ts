import { hapticNotification, NotificationType } from "@/features/foundation/safe-haptics";
import { requireOptionalNativeModule } from "expo-modules-core";

export type ScanFeedbackTone = "success" | "warning" | "danger" | "neutral";

type AudibleScanFeedbackTone = Exclude<ScanFeedbackTone, "neutral">;

type AudioPlayerHandle = {
  play: () => void;
  seekTo: (seconds: number) => Promise<void>;
  volume: number;
};

type AudioModuleHandle = {
  createAudioPlayer: (
    source: number,
    options: {
      keepAudioSessionActive: boolean;
      updateInterval: number;
    }
  ) => AudioPlayerHandle;
  setAudioModeAsync: (mode: {
    allowsRecording: boolean;
    interruptionMode: "mixWithOthers";
    playsInSilentMode: boolean;
    shouldPlayInBackground: boolean;
  }) => Promise<void>;
};

type AudioModuleCandidate = {
  createAudioPlayer?: unknown;
  setAudioModeAsync?: unknown;
};

const audioSources = {
  danger: require("../../../assets/sounds/scan-error.wav") as number,
  success: require("../../../assets/sounds/scan-success.wav") as number,
  warning: require("../../../assets/sounds/scan-warning.wav") as number,
} satisfies Record<AudibleScanFeedbackTone, number>;

const audioVolumes = {
  danger: 0.86,
  success: 0.74,
  warning: 0.78,
} satisfies Record<AudibleScanFeedbackTone, number>;

let audioModulePromise: Promise<AudioModuleHandle | null> | null = null;
const audioPlayers: Partial<Record<AudibleScanFeedbackTone, AudioPlayerHandle>> = {};

const resolveAudioModule = (moduleValue: unknown): AudioModuleHandle | null => {
  const candidate = moduleValue as AudioModuleCandidate;

  if (typeof candidate.createAudioPlayer !== "function" || typeof candidate.setAudioModeAsync !== "function") {
    return null;
  }

  const createAudioPlayer = candidate.createAudioPlayer as AudioModuleHandle["createAudioPlayer"];
  const setAudioModeAsync = candidate.setAudioModeAsync as AudioModuleHandle["setAudioModeAsync"];

  return {
    createAudioPlayer,
    setAudioModeAsync,
  } satisfies AudioModuleHandle;
};

const isExpoAudioNativeModuleAvailable = (): boolean => {
  try {
    return requireOptionalNativeModule("ExpoAudio") !== null;
  } catch {
    return false;
  }
};

const requireAudioModule = (): unknown | null => {
  if (!isExpoAudioNativeModuleAvailable()) {
    return null;
  }

  // Dynamic import still evaluates ExpoAudio before stale dev clients can recover.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("expo-audio") as unknown;
};

const loadAudioModuleAsync = async (): Promise<AudioModuleHandle | null> => {
  if (audioModulePromise !== null) {
    return audioModulePromise;
  }

  audioModulePromise = Promise.resolve()
    .then(async () => {
      let moduleValue: unknown;

      try {
        moduleValue = requireAudioModule();
      } catch {
        return null;
      }

      if (moduleValue === null) {
        return null;
      }

      const audioModule = resolveAudioModule(moduleValue);

      if (audioModule === null) {
        return null;
      }

      await audioModule.setAudioModeAsync({
        allowsRecording: false,
        interruptionMode: "mixWithOthers",
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });

      return audioModule;
    })
    .catch(() => null);

  return audioModulePromise;
};

const getAudioPlayerAsync = async (tone: AudibleScanFeedbackTone): Promise<AudioPlayerHandle | null> => {
  const existingPlayer = audioPlayers[tone];

  if (existingPlayer !== undefined) {
    return existingPlayer;
  }

  const audioModule = await loadAudioModuleAsync();

  if (audioModule === null) {
    return null;
  }

  const player = audioModule.createAudioPlayer(audioSources[tone], {
    keepAudioSessionActive: false,
    updateInterval: 1_000,
  });

  player.volume = audioVolumes[tone];
  audioPlayers[tone] = player;

  return player;
};

const playScanToneAsync = async (tone: AudibleScanFeedbackTone): Promise<void> => {
  const player = await getAudioPlayerAsync(tone);

  if (player === null) {
    return;
  }

  await player.seekTo(0);
  player.play();
};

export const triggerScanFeedback = (tone: ScanFeedbackTone): void => {
  if (tone === "success") {
    hapticNotification(NotificationType.Success);
    void playScanToneAsync("success").catch(() => {});
    return;
  }

  if (tone === "warning") {
    hapticNotification(NotificationType.Warning);
    void playScanToneAsync("warning").catch(() => {});
    return;
  }

  if (tone === "danger") {
    hapticNotification(NotificationType.Error);
    void playScanToneAsync("danger").catch(() => {});
  }
};
