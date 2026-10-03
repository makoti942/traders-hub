import { useMemo } from 'react';

import { FormatUtils } from '@deriv-com/utils';

import { useDerivSession } from './useDerivSession';

/**
 * Live Deriv balance via WebSocket authorize + balance subscription.
 */
export const useLiveDerivBalance = () => {
    const session = useDerivSession();
    const { formatMoney } = FormatUtils;
    const currency = session.activeAccount?.currency || session.live?.currency || 'USD';

    const accountsWithBalance = useMemo(() => {
        return session.accounts.map(acc => {
            const balance = acc.balance || 0;
            return {
                ...acc,
                balance,
                displayBalance: `${formatMoney(balance, { currency: currency as never, decimalPlaces: 2 })} ${acc.currency || currency}`,
            };
        });
    }, [session.accounts, currency, formatMoney]);

    const formattedActiveBalance = useMemo(() => {
        if (!session.isAuthorized) return '';
        return `${formatMoney(session.activeBalance, { currency: currency as never, decimalPlaces: 2 })} ${currency}`;
    }, [session.activeBalance, session.isAuthorized, currency, formatMoney]);

    return {
        isAuthorized: session.isAuthorized,
        accounts: accountsWithBalance,
        activeLoginid: session.activeLoginid,
        activeAccount: session.activeAccount,
        activeBalance: session.activeBalance,
        formattedActiveBalance,
        currency,
        rawLive: session.live,
    };
};

export default useLiveDerivBalance;
