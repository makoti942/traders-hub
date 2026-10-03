import { useMemo } from 'react';

import { useDerivTradingAccountsList } from '.';

/**
 * Custom hook to get the active trading account (live balance after OAuth).
 */
export const useActiveDerivTradingAccount = () => {
    const { data } = useDerivTradingAccountsList();

    const activeTradingAccount = useMemo(() => {
        return data?.find((trading: any) => trading.isActive) || data?.[0] || null;
    }, [data]);

    return { data: activeTradingAccount };
};
