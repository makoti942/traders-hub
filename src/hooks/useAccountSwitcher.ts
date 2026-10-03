import { useCallback, useEffect, useState } from 'react';

import { Regulation } from '@/constants';
import { useUIContext } from '@/providers';
import { startPerformanceEventTimer } from '@/utils';

import {
    useActiveDerivTradingAccount,
    useDerivSession,
    useDerivTradingAccountsList,
    useIsDIELEnabled,
    useQueryParams,
    useRegulationFlags,
} from '.';

const accountTypes = [
    { label: 'Demo', value: 'demo' },
    { label: 'Real', value: 'real' },
] as const;

type TAccountType = (typeof accountTypes)[number];

/**
 * Switch between demo and real accounts using the live OAuth session.
 */
export const useAccountSwitcher = () => {
    const { data: tradingAccountsList } = useDerivTradingAccountsList();
    const { data: activeTradingAccount } = useActiveDerivTradingAccount();
    const { setUIState } = useUIContext();
    const { switchAccount } = useDerivSession();
    const activeAccountType = activeTradingAccount?.is_virtual ? accountTypes[0].value : accountTypes[1].value;
    const activeType = accountTypes.find(account => account.value === activeAccountType);
    const [selectedAccount, setSelected] = useState(activeType);
    const firstRealLoginId = tradingAccountsList?.find(acc => !acc.is_virtual)?.loginid;
    const demoLoginId = tradingAccountsList?.find(acc => acc.is_virtual)?.loginid;
    const { data: isDIEL } = useIsDIELEnabled();

    const { regulationFlags } = useRegulationFlags();
    const { isEU, hasActiveDerivAccount } = regulationFlags;
    const { openModal } = useQueryParams();

    useEffect(() => {
        if (isDIEL && activeAccountType === accountTypes[0].value) {
            setUIState({
                regulation: Regulation.NonEU,
            });
        }

        if (activeType) {
            setSelected(activeType);
            setUIState({
                accountType: activeAccountType,
            });
        }
    }, [activeAccountType, activeType, isDIEL, setUIState]);

    const setSelectedAccount = useCallback(
        (account: TAccountType) => {
            setSelected(account);
            setUIState({
                accountType: account.value,
            });

            const loginId = account.value === accountTypes[0].value ? demoLoginId : firstRealLoginId;
            if (loginId) {
                if (account.value === accountTypes[0].value)
                    startPerformanceEventTimer('switch_from_real_to_demo_time');
                else startPerformanceEventTimer('switch_from_demo_to_real_time');
                switchAccount(String(loginId));
            }

            if (isEU && openModal && account.value === 'real' && !hasActiveDerivAccount) {
                openModal('RealAccountCreation');
            }
        },
        [demoLoginId, firstRealLoginId, hasActiveDerivAccount, isEU, openModal, setUIState, switchAccount]
    );

    return {
        selectedAccount,
        setSelectedAccount,
        accountTypes,
    };
};
