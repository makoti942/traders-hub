import { useMemo } from 'react';

import { CurrencyConstants, FormatUtils } from '@deriv-com/utils';

import { useBalance, useCurrencyConfig, useSettings } from '.';
import { useLiveDerivBalance } from './useLiveDerivBalance';

/**
 * Custom hook to get a list of trading accounts with live balances.
 */
export const useDerivTradingAccountsList = () => {
    const { data: balanceData } = useBalance();
    const { accounts: liveAccounts, isAuthorized, activeLoginid } = useLiveDerivBalance();
    const { getConfig } = useCurrencyConfig();
    const { data: settingsData } = useSettings();

    const { formatMoney } = FormatUtils;

    const modifiedAccountsWithBalance = useMemo(() => {
        if (isAuthorized && liveAccounts.length) {
            return liveAccounts.map(account => {
                const currencyConfig = account.currency ? getConfig(account.currency) : undefined;
                return {
                    ...account,
                    isActive: account.loginid === activeLoginid,
                    currencyConfig,
                    isVirtual: account.is_virtual,
                    platform: 'deriv' as const,
                    balance: account.balance,
                    displayBalance: account.displayBalance ||
                        `${formatMoney(account.balance, {
                            currency: currencyConfig?.display_code as CurrencyConstants.Currency,
                            decimalPlaces: currencyConfig?.fractional_digits ?? 2,
                            locale: settingsData?.preferred_language ?? 'en',
                        })} ${currencyConfig?.display_code ?? account.currency}`,
                };
            });
        }

        return [] as Array<Record<string, unknown>>;
    }, [isAuthorized, liveAccounts, activeLoginid, getConfig, formatMoney, settingsData?.preferred_language]);

    const fiatAccount =
        modifiedAccountsWithBalance?.find((account: any) => getConfig(account.currency ?? '')?.isFiat)?.currency ??
        'USD';

    return { data: modifiedAccountsWithBalance, fiatAccount };
};
