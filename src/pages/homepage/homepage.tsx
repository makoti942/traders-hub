import { Fragment } from 'react/jsx-runtime';

import { useDevice } from '@deriv-com/ui';

import {
    AppContainer,
    RegulationSwitcherDesktop,
    RegulationSwitcherMobile,
    TotalAssets,
    TradersHubDesktopContent,
    TradersHubHeader,
    TradersHubMobileContent,
} from '@/components';
import { useDerivSession, useIsDIELEnabled, useRegulationFlags } from '@/hooks';
import { Modals } from '@/modals/Modals';

export const Homepage = () => {
    const { isDesktop } = useDevice();
    const { isAuthorized } = useDerivSession();

    const { regulationFlags } = useRegulationFlags();
    const { hasActiveDerivAccount } = regulationFlags;
    const isDemo = isAuthorized;
    const isReal = isAuthorized;
    const { data: isDIEL } = useIsDIELEnabled();
    const isTotalAssetsVisible = (hasActiveDerivAccount || isDemo) && isAuthorized;

    const isSwitcherVisible = isDIEL && isReal;

    return (
        <Fragment>
            <AppContainer>
                <div className=' flex gap-24 p-16 lg:p-40 align-middle flex-col'>
                    <div className='flex justify-between flex-wrap items-center'>
                        <TradersHubHeader />
                        {isSwitcherVisible &&
                            (isDesktop ? <RegulationSwitcherDesktop /> : <RegulationSwitcherMobile />)}
                        {isTotalAssetsVisible && <TotalAssets />}
                    </div>
                    {!isDesktop ? <TradersHubMobileContent /> : <TradersHubDesktopContent />}
                </div>
            </AppContainer>
            <Modals />
        </Fragment>
    );
};
