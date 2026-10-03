import { useCallback, useMemo } from 'react';

import { useWebsiteStatus } from '@deriv-com/api-hooks';

import { reorderCurrencies } from '@/helpers';

import { useActiveDerivTradingAccount, useDerivTradingAccountsList, useLandingCompany, useRegulationFlags } from '.';

type TWebsiteStatus = NonNullable<ReturnType<typeof useWebsiteStatus>['data']>;
export type TCurrencyConfig = NonNullable<TWebsiteStatus>['currencies_config'][string] & {
    id?: string;
    isAdded?: boolean;
};

export type TCurrencies = {
    CRYPTO: TCurrencyConfig[];
    FIAT: TCurrencyConfig[];
};

/** A custom hook to get the currency config information from `website_status` endpoint and in predefined order */
export const useCurrencies = () => {
    const { data: activeDerivTradingAccount } = useActiveDerivTradingAccount();
    const { data: tradingAccountsList, isLoading: isAuthorizeLoading } = useDerivTradingAccountsList();
    const { data: websiteStatusData, isLoading: isWebsiteStatusLoading, ...rest } = useWebsiteStatus();
    const { data: landingCompanyData, isLoading: isLandingCompanyLoading } = useLandingCompany();

    const { regulationFlags } = useRegulationFlags();
    const { isNonEU } = regulationFlags;

    // Get the legal allowed currencies based on the landing company
    const legalAllowedCurrencies = useMemo(() => {
        if (!landingCompanyData) return [];
        if (isNonEU) {
            return landingCompanyData.gaming_company?.legal_allowed_currencies;
        }

        return landingCompanyData.financial_company?.legal_allowed_currencies;
    }, [isNonEU, landingCompanyData]);

    // Check if the currency is already added to the account list to disable the currency
    const isAdded = useCallback(
        (currency: string) => {
            const currencyAccount = tradingAccountsList?.find((account: { currency?: string }) => account.currency === currency);
            if (!currencyAccount) return false;

            const { currency: accountCurrency, landing_company_name: landingCompany } = currencyAccount as {
                currency?: string;
                landing_company_name?: string;
            };

            return accountCurrency === currency && landingCompany !== 'virtual';
        },
        [tradingAccountsList]
    );

    // Get the currency config and reorder the currencies based on the predefined order
    const currencyConfig = useMemo(() => {
        if (!websiteStatusData?.currencies_config) return;
        const currencies: TCurrencies = {
            FIAT: [],
            CRYPTO: [],
        };

        // map the currencies to their respective types (FIAT or CRYPTO) with their id
        Object.entries(websiteStatusData?.currencies_config)
            .filter(([key]) => legalAllowedCurrencies?.includes(key))
            .forEach(([key, value]) => {
                currencies[value.type.toUpperCase() as keyof TCurrencies].push({
                    ...value,
                    id: key,
                    isAdded: isAdded(key),
                });
            });

        // reorder the currencies based on the predefined order
        return {
            FIAT: reorderCurrencies(currencies.FIAT, 'FIAT'),
            CRYPTO: reorderCurrencies(currencies.CRYPTO, 'CRYPTO'),
        };
    }, [websiteStatusData?.currencies_config, isAdded, legalAllowedCurrencies]);

    // Check if all the crypto currencies are already added to the account list
    const allCryptoCurrenciesAreAdded = useMemo(
        () => currencyConfig?.CRYPTO.every(currency => currency.isAdded) ?? false,
        [currencyConfig?.CRYPTO]
    );

    // Get the current account currency with its config and isAdded status
    const currentAccountCurrencyConfig = useMemo(() => {
        const currencyCode = (activeDerivTradingAccount as { currency?: string } | null)?.currency;
        if (!currencyCode || !websiteStatusData?.currencies_config) return;

        return {
            ...websiteStatusData?.currencies_config[currencyCode],
            id: currencyCode,
        };
    }, [activeDerivTradingAccount, websiteStatusData?.currencies_config]);

    // Get the added fiat currency with its config
    const addedFiatCurrency = useMemo(() => {
        return currencyConfig?.FIAT.find(currency => currency.isAdded);
    }, [currencyConfig?.FIAT]);

    return {
        ...rest,
        data: currencyConfig,
        isLoading: isAuthorizeLoading || isWebsiteStatusLoading || isLandingCompanyLoading,
        allCryptoCurrenciesAreAdded,
        currentAccountCurrencyConfig,
        addedFiatCurrency,
    };
};
