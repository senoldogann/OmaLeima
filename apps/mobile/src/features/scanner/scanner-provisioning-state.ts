import { useSyncExternalStore } from "react";

type ScannerProvisioningListener = () => void;

let isScannerProvisioningActive = false;
const listeners = new Set<ScannerProvisioningListener>();

const emitScannerProvisioningChange = (): void => {
  listeners.forEach((listener) => listener());
};

const subscribeScannerProvisioning = (listener: ScannerProvisioningListener): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const getScannerProvisioningSnapshot = (): boolean => isScannerProvisioningActive;

export const setScannerProvisioningActive = (nextValue: boolean): void => {
  if (isScannerProvisioningActive === nextValue) {
    return;
  }

  isScannerProvisioningActive = nextValue;
  emitScannerProvisioningChange();
};

export const useIsScannerProvisioningActive = (): boolean =>
  useSyncExternalStore(
    subscribeScannerProvisioning,
    getScannerProvisioningSnapshot,
    getScannerProvisioningSnapshot
  );
