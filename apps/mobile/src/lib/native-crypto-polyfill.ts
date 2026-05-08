import * as ExpoCrypto from "expo-crypto";
import { Platform } from "react-native";

type DigestAlgorithmName = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

type CryptoSubtleDigest = {
  digest: (algorithm: AlgorithmIdentifier, data: BufferSource) => Promise<ArrayBuffer>;
};

type PartialNativeCrypto = {
  getRandomValues?: Crypto["getRandomValues"];
  randomUUID?: Crypto["randomUUID"];
  subtle?: Partial<CryptoSubtleDigest>;
};

type ExpoRandomValuesInput = Parameters<typeof ExpoCrypto.getRandomValues>[0];

const digestAlgorithmByName: Record<DigestAlgorithmName, ExpoCrypto.CryptoDigestAlgorithm> = {
  "SHA-1": ExpoCrypto.CryptoDigestAlgorithm.SHA1,
  "SHA-256": ExpoCrypto.CryptoDigestAlgorithm.SHA256,
  "SHA-384": ExpoCrypto.CryptoDigestAlgorithm.SHA384,
  "SHA-512": ExpoCrypto.CryptoDigestAlgorithm.SHA512,
};

const normalizeDigestAlgorithm = (algorithm: AlgorithmIdentifier): ExpoCrypto.CryptoDigestAlgorithm => {
  const algorithmName = typeof algorithm === "string" ? algorithm : algorithm.name;
  const normalizedAlgorithmName = algorithmName.toUpperCase() as DigestAlgorithmName;
  const normalizedAlgorithm = digestAlgorithmByName[normalizedAlgorithmName];

  if (typeof normalizedAlgorithm === "undefined") {
    throw new Error(`Unsupported native WebCrypto digest algorithm: ${algorithmName}`);
  }

  return normalizedAlgorithm;
};

const nativeDigestAsync = async (
  algorithm: AlgorithmIdentifier,
  data: BufferSource
): Promise<ArrayBuffer> =>
  await ExpoCrypto.digest(
    normalizeDigestAlgorithm(algorithm),
    data
  );

const isExpoRandomValuesInput = (array: ArrayBufferView): array is ExpoRandomValuesInput =>
  array instanceof Int8Array ||
  array instanceof Int16Array ||
  array instanceof Int32Array ||
  array instanceof Uint8Array ||
  array instanceof Uint8ClampedArray ||
  array instanceof Uint16Array ||
  array instanceof Uint32Array;

const nativeGetRandomValues: Crypto["getRandomValues"] = <T extends ArrayBufferView>(array: T): T => {
  if (!isExpoRandomValuesInput(array)) {
    throw new TypeError("Native WebCrypto getRandomValues requires an integer typed array.");
  }

  ExpoCrypto.getRandomValues(array);

  return array;
};

const nativeRandomUuid: Crypto["randomUUID"] = (): ReturnType<Crypto["randomUUID"]> =>
  ExpoCrypto.randomUUID() as ReturnType<Crypto["randomUUID"]>;

const defineGlobalCrypto = (crypto: PartialNativeCrypto): void => {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: crypto,
  });
};

export const installNativeCryptoPolyfill = (): void => {
  if (Platform.OS === "web") {
    return;
  }

  const currentCrypto = globalThis.crypto as PartialNativeCrypto | undefined;
  const nextCrypto: PartialNativeCrypto = currentCrypto ?? {};

  if (typeof nextCrypto.getRandomValues !== "function") {
    nextCrypto.getRandomValues = nativeGetRandomValues;
  }

  if (typeof nextCrypto.randomUUID !== "function") {
    nextCrypto.randomUUID = nativeRandomUuid;
  }

  if (typeof nextCrypto.subtle?.digest !== "function") {
    nextCrypto.subtle = {
      ...nextCrypto.subtle,
      digest: nativeDigestAsync,
    };
  }

  if (typeof currentCrypto === "undefined") {
    defineGlobalCrypto(nextCrypto);
  }
};

installNativeCryptoPolyfill();
