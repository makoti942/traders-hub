import { useMemo } from 'react';

import { useDerivTradingAccountsList } from '.';

/**
 * Active trading account from live OAuth session.
 */
export const useActiveDerivTradingAccount = () => {
    const { data } = useDerivTradingAccountsList();

    const activeTradingAccount = useMemo(() => {
        return data.find(trading => trading.isActive) || data[0] || null;
    }, [data]);

    return { data: activeTradingAccount, isSuccess: Boolean(activeTradingAccount) };
};
