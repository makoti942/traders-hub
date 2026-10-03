import { PlatformDetails } from '@cfd/constants';
import { useAuthData } from '@deriv-com/api-hooks';
import { URLUtils } from '@deriv-com/utils';

import {
    IconComponent,
    TradingAccountCard,
    TradingAccountCardContent,
    TradingAccountCardLightButton,
} from '@/components';
import { getCfdsAccountTitle } from '@/helpers/cfdsAccountHelpers';
import { useActiveDerivTradingAccount, useQueryParams, useRegulationFlags } from '@/hooks';
import { useCFDContext } from '@/providers';

const { getDerivStaticURL } = URLUtils;

const LeadingIcon = () => (
    <div>
        <IconComponent
            icon='DerivX'
            onClick={() => {
                window.open(getDerivStaticURL('/derivx'));
            }}
        />
    </div>
);

export const AvailableDxtradeAccountsList = () => {
    const { regulationFlags } = useRegulationFlags();
    const { hasActiveDerivAccount } = regulationFlags;
    const { openModal } = useQueryParams();
    const { setCfdState } = useCFDContext();
    const { data: activeTradingAccount } = useActiveDerivTradingAccount();
    const { isAuthorized } = useAuthData();

    const { getOauthURL } = URLUtils;

    const TrailingButton = () => <TradingAccountCardLightButton onSubmit={trailingButtonClick} />;

    const title = getCfdsAccountTitle(PlatformDetails.dxtrade.title, Boolean(activeTradingAccount?.isVirtual));

    const trailingButtonClick = () => {
        if (!isAuthorized) {
            return (window.location.href = getOauthURL());
        }
        if (!hasActiveDerivAccount && isAuthorized) {
            // TODO: Add GetDerivAccountDialog here
        } else {
            setCfdState({ platform: PlatformDetails.dxtrade.platform });
            openModal('DxtradePasswordModal');
        }
    };
    return (
        <TradingAccountCard leading={LeadingIcon} trailing={TrailingButton}>
            <TradingAccountCardContent title={title}>
                This account offers CFDs on a highly customisable CFD trading platform.
            </TradingAccountCardContent>
        </TradingAccountCard>
    );
};
