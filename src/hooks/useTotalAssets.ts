import { CurrencyConstants, FormatUtils } from '@deriv-com/utils';

import { useLiveDerivBalance } from './useLiveDerivBalance';

/**
 * Total assets from live Deriv trading balances.
 */
export const useTotalAssets = () => {
    const { accounts, activeAccount, activeBalance, isAuthorized } = useLiveDerivBalance();
    const { formatMoney } = FormatUtils;

    const totalBalance = isAuthorized
        ? accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0) || activeBalance
        : 0;

    const currency = (activeAccount?.currency || 'USD') as CurrencyConstants.Currency;
    const formattedTotalBalance = isAuthorized
        ? `${formatMoney(totalBalance, { currency })} ${currency}`
        : '';

    return { formattedTotalBalance, totalBalance, currency };
};
