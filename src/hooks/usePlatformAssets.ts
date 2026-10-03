import { useMemo } from 'react';

import { useLiveDerivBalance } from './useLiveDerivBalance';

/**
 * Total balance of Deriv trading accounts from live WebSocket data.
 */
export const usePlatformAssets = () => {
    const { accounts, activeAccount, isAuthorized } = useLiveDerivBalance();

    const fiatCurrency = activeAccount?.currency || 'USD';

    const totalDerivTradingAccountBalance = useMemo(() => {
        if (!isAuthorized) {
            return { demo: 0, real: 0 };
        }

        return accounts.reduce(
            (totals, account) => {
                if (account.is_virtual) {
                    totals.demo += account.balance || 0;
                } else {
                    totals.real += account.balance || 0;
                }
                return totals;
            },
            { demo: 0, real: 0 }
        );
    }, [accounts, isAuthorized]);

    return { totalDerivTradingAccountBalance, fiatCurrency };
};

