import { useMemo } from 'react';

import { CurrencyConstants, FormatUtils } from '@deriv-com/utils';

import { useCurrencyConfig, useSettings } from '.';
import { useLiveDerivBalance } from './useLiveDerivBalance';

export type TDerivTradingAccount = {
    loginid: string;
    token: string;
    currency: string;
    is_virtual: boolean;
    isVirtual: boolean;
    isActive: boolean;
    balance: number;
    displayBalance: string;
    platform: 'deriv';
    broker: string;
    landing_company_name: string;
    currencyConfig?: {
        display_code?: string;
        fractional_digits?: number;
        [key: string]: unknown;
    };
};

/**
 * Trading accounts with live WebSocket balances after OAuth.
 */
export const useDerivTradingAccountsList = () => {
    const { accounts, isAuthorized, activeLoginid } = useLiveDerivBalance();
    const { getConfig } = useCurrencyConfig();
    const { data: settingsData } = useSettings();
    const { formatMoney } = FormatUtils;

    const data = useMemo<TDerivTradingAccount[]>(() => {
        if (!isAuthorized) return [];

        return accounts.map(account => {
            const currencyConfig = account.currency ? getConfig(account.currency) : undefined;
            const displayBalance =
                account.displayBalance ||
                `${formatMoney(account.balance, {
                    currency: currencyConfig?.display_code as CurrencyConstants.Currency,
                    decimalPlaces: currencyConfig?.fractional_digits ?? 2,
                    locale: settingsData?.preferred_language ?? 'en',
                })} ${currencyConfig?.display_code ?? account.currency}`;

            return {
                loginid: account.loginid,
                token: account.token,
                currency: account.currency,
                is_virtual: account.is_virtual,
                isVirtual: account.is_virtual,
                isActive: account.loginid === activeLoginid,
                balance: account.balance,
                displayBalance,
                platform: 'deriv' as const,
                broker: account.loginid.slice(0, 2).toUpperCase(),
                landing_company_name: account.is_virtual ? 'virtual' : 'svg',
                currencyConfig: currencyConfig as TDerivTradingAccount['currencyConfig'],
            };
        });
    }, [accounts, isAuthorized, activeLoginid, getConfig, formatMoney, settingsData?.preferred_language]);

    const fiatAccount = data.find(account => getConfig(account.currency ?? '')?.isFiat)?.currency ?? 'USD';

    return { data, fiatAccount, isLoading: false };
};
