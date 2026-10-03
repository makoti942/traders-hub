import { useEffect } from 'react';

import { Regulation } from '@/constants';
import { useDerivSession, useDerivTradingAccountsList, useRegulationFlags } from '@/hooks';
import { useUIContext } from '@/providers';

/**
 * Switch between EU and non-EU accounts using the live OAuth session.
 */
export const useRegulationSwitcher = () => {
    const { switchAccount } = useDerivSession();
    const { data: tradingAccountsList } = useDerivTradingAccountsList();
    const { setUIState, uiState } = useUIContext();
    const currentRegulation = uiState.regulation;
    const { regulationFlags } = useRegulationFlags();
    const { isEU, isHighRisk } = regulationFlags;

    const realCRAccount = tradingAccountsList?.find(account => String(account.loginid).startsWith('CR'))?.loginid ?? '';
    const realMFAccount = tradingAccountsList?.find(account => String(account.loginid).startsWith('MF'))?.loginid ?? '';

    const activeLoginid = tradingAccountsList?.find(account => account.isActive)?.loginid || '';

    const buttons = [{ label: Regulation.NonEU }, { label: Regulation.EU }];

    const handleButtonClick = (label: string) => {
        if (label !== currentRegulation) {
            if (label === Regulation.NonEU) {
                setUIState({
                    regulation: Regulation.NonEU,
                });
                if (realCRAccount) {
                    switchAccount(String(realCRAccount));
                }
            } else {
                setUIState({
                    regulation: Regulation.EU,
                });
                if (realMFAccount) {
                    switchAccount(String(realMFAccount));
                }
            }
        }
    };

    useEffect(() => {
        if (activeLoginid.startsWith('CR') || isHighRisk) {
            setUIState({
                regulation: Regulation.NonEU,
            });
        } else if (activeLoginid.startsWith('MF') || isEU) {
            setUIState({
                regulation: Regulation.EU,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        buttons,
        handleButtonClick,
    };
};
