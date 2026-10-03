import { useEffect, useMemo, useState } from 'react';

import { FormatUtils } from '@deriv-com/utils';

import { useDerivSession } from './useDerivSession';

/**
 * Live Deriv balance via WebSocket authorize + balance subscription.
 * Works on custom domains after OAuth returns tokens to /redirect.
 */
export const useLiveDerivBalance = () => {
    const { isAuthorized, accounts, activeLoginid, activeAccount, activeBalance, live } = useDerivSession();
    const { formatMoney } = FormatUtils;
    const currency = activeAccount?.currency || live?.currency || 'USD';

    const accountsWithBalance = useMemo(() => {
        const balanceByLogin = new Map<string, number>();
        live?.accountList?.forEach(acc => balanceByLogin.set(acc.loginid, acc.balance));
        if (activeBalance > 0 && activeLoginid) {
            balanceByLogin.set(activeLoginid, activeBalance);
        }

        return accounts.map(acc => {
            const balance = balanceByLogin.get(acc.loginid) ?? 0;
            return {
                ...acc,
                balance,
                displayBalance: `${formatMoney(balance, { currency: currency as never, decimalPlaces: 2 })} ${acc.currency}`,
            };
        });
    }, [accounts, live, activeBalance, activeLoginid, currency, formatMoney]);

    const formattedActiveBalance = useMemo(() => {
        if (!isAuthorized) return '';
        const amount = activeBalance || activeAccount ? activeBalance : 0;
        return `${formatMoney(amount, { currency: currency as never, decimalPlaces: 2 })} ${currency}`;
    }, [activeBalance, activeAccount, currency, formatMoney, isAuthorized]);

    return {
        isAuthorized,
        accounts: accountsWithBalance,
        activeLoginid,
        activeAccount,
        activeBalance,
        formattedActiveBalance,
        currency,
        rawLive: live,
    };
};

export default useLiveDerivBalance;
