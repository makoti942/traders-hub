import { useMemo } from 'react';

import { useLiveDerivBalance } from './useLiveDerivBalance';

export const useBalance = () => {
    const { accounts, activeLoginid, activeBalance, isAuthorized } = useLiveDerivBalance();

    const data = useMemo(() => {
        const map: Record<string, { balance: number }> = {};
        accounts.forEach(acc => {
            map[acc.loginid] = { balance: acc.balance };
        });
        if (activeLoginid && !map[activeLoginid] && isAuthorized) {
            map[activeLoginid] = { balance: activeBalance };
        }
        return { accounts: map };
    }, [accounts, activeLoginid, activeBalance, isAuthorized]);

    return { data, error: undefined as Error | undefined, isAuthorized, activeLoginid, activeBalance };
};
