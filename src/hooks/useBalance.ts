import { useMemo } from 'react';

import { useLiveDerivBalance } from './useLiveDerivBalance';

/**
 * Balance for all Deriv trading accounts.
 * Prefers live WebSocket data after OAuth login on a custom domain.
 */
export const useBalance = () => {
    const { accounts, activeLoginid, activeBalance, isAuthorized } = useLiveDerivBalance();

    const data = useMemo(() => {
        if (!isAuthorized) {
            return { accounts: {} as Record<string, { balance: number }> };
        }

        const map: Record<string, { balance: number }> = {};
        accounts.forEach(acc => {
            map[acc.loginid] = { balance: acc.balance };
        });
        if (activeLoginid && !map[activeLoginid]) {
            map[activeLoginid] = { balance: activeBalance };
        }
        return { accounts: map };
    }, [accounts, activeLoginid, activeBalance, isAuthorized]);

    return { data, isAuthorized, activeLoginid, activeBalance };
};
