import { useCallback, useEffect, useRef, useState } from "react";

type RefetchAsync = () => Promise<unknown>;

type ManualRefreshState = {
    isRefreshing: boolean;
    refreshAsync: () => void;
};

const manualRefreshTimeoutMs = 15_000;

const rejectAfterTimeoutAsync = async (): Promise<never> =>
    new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(`Manual refresh timed out after ${manualRefreshTimeoutMs}ms.`));
        }, manualRefreshTimeoutMs);
    });

export const useManualRefresh = (refetchAsync: RefetchAsync): ManualRefreshState => {
    const isMountedRef = useRef<boolean>(true);
    const isRefreshingRef = useRef<boolean>(false);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    useEffect(
        () => () => {
            isMountedRef.current = false;
        },
        []
    );

    const refreshAsync = useCallback((): void => {
        if (isRefreshingRef.current) {
            return;
        }

        isRefreshingRef.current = true;
        setIsRefreshing(true);

        void Promise.race([refetchAsync(), rejectAfterTimeoutAsync()])
            .catch((error: unknown) => {
                console.error("Manual refresh failed.", { error });
            })
            .finally(() => {
                isRefreshingRef.current = false;

                if (isMountedRef.current) {
                    setIsRefreshing(false);
                }
            });
    }, [refetchAsync]);

    return {
        isRefreshing,
        refreshAsync,
    };
};
