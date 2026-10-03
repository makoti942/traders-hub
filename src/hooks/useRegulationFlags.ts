import { useMemo } from 'react';

import { useWebsiteStatus } from '@deriv-com/api-hooks';

import { Regulation } from '@/constants';
import { isEuCountry } from '@/helpers';
import { useUIContext } from '@/providers';

import { useDerivSession } from './useDerivSession';
import { useIsEuRegion } from './useIsEuRegion';

/**
 * Regulation flags using live OAuth session (works after redirect back from Deriv).
 */
export const useRegulationFlags = () => {
    const { uiState } = useUIContext();
    const { accountType, regulation } = uiState;
    const isEUCountry = useIsEuRegion();
    const { isAuthorized, activeAccount, accounts } = useDerivSession();
    const { data: websiteStatusData } = useWebsiteStatus();

    const regulationFlags = useMemo(() => {
        const clientCountry = websiteStatusData?.clients_country;
        const isEUResidence = isEuCountry(clientCountry ?? '');

        if (!isAuthorized || !accounts.length) {
            return {
                hasActiveDerivAccount: false,
                isEU: isEUResidence,
                isEURealAccount: false,
                isHighRisk: false,
                isNonEU: false,
                isNonEURealAccount: false,
                isSuccess: false,
                noRealCRNonEUAccount: false,
                noRealMFEUAccount: false,
            };
        }

        const isEURegulation = regulation === Regulation.EU;
        const isNonEURegulation = regulation === Regulation.NonEU;

        const isEU = isEUCountry || isEURegulation;
        const isNonEU = isNonEURegulation;

        const isRealAccount = !activeAccount?.is_virtual || accountType === 'real';
        const hasRealAccount = accounts.some(acc => !acc.is_virtual);

        const isEURealAccount = isEU && isRealAccount;
        const isNonEURealAccount = isNonEU && isRealAccount;

        const noRealCRNonEUAccount = isNonEU && !hasRealAccount && isRealAccount;
        const noRealMFEUAccount = isEU && !hasRealAccount && isRealAccount;

        const hasActiveDerivAccount = !(noRealCRNonEUAccount || noRealMFEUAccount);

        return {
            hasActiveDerivAccount,
            isEU,
            isEURealAccount,
            isHighRisk: false,
            isNonEU,
            isNonEURealAccount,
            isSuccess: true,
            noRealCRNonEUAccount,
            noRealMFEUAccount,
        };
    }, [
        websiteStatusData?.clients_country,
        regulation,
        isAuthorized,
        isEUCountry,
        activeAccount?.is_virtual,
        accountType,
        accounts,
    ]);

    return { regulationFlags };
};
