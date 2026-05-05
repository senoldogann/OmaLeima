import { useCallback, useEffect, useRef, useState } from "react";

type RefetchAsync = () => Promise<unknown>;

type ManualRefreshState = {
    isRefreshing: boolean;
    refreshAsync: () => void;
};

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

        void refetchAsync().finally(() => {
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