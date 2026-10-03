import { StandaloneChevronDownBoldIcon } from '@deriv/quill-icons';
import { useTopupVirtual } from '@deriv-com/api-hooks';
import { Button } from '@deriv-com/ui';

import { CurrencySwitcherLoader } from '@/components';
import { IconToCurrencyMapper } from '@/constants';
import { derivUrls } from '@/helpers';
import { useCurrencyConfig, useDerivSession, useQueryParams, useRegulationFlags } from '@/hooks';
import { THooks } from '@/types';
import { startPerformanceEventTimer } from '@/utils';

import { DemoCurrencySwitcherAccountInfo, RealCurrencySwitcherAccountInfo } from './CurrencySwitcherAccountInfo';

type AccountActionButtonProps = {
    balance: THooks.ActiveDerivTradingAccount['balance'];
    isDemo: THooks.ActiveDerivTradingAccount['isVirtual'];
};

const AccountActionButton = ({ balance, isDemo }: AccountActionButtonProps) => {
    const { mutate: resetVirtualBalance } = useTopupVirtual();
    const { activeLoginid } = useDerivSession();
    const { data: currencyConfig } = useCurrencyConfig();
    let buttonText = 'Deposit';
    if (isDemo && balance !== 10000) {
        buttonText = 'Reset Balance';
    } else if (isDemo) {
        return null;
    }

    return (
        <Button
            color='black'
            onClick={() => {
                if (isDemo) {
                    resetVirtualBalance({
                        loginid: activeLoginid,
                    });
                } else {
                    if (currencyConfig?.currency?.isCrypto)
                        startPerformanceEventTimer('load_crypto_deposit_cashier_time');
                    else startPerformanceEventTimer('load_fiat_deposit_cashier_time');
                    window.location.href = `${derivUrls.DERIV_APP_PRODUCTION}/cashier/deposit#deposit`;
                }
            }}
            variant='outlined'
            size='sm'
        >
            {buttonText}
        </Button>
    );
};

export const CurrencySwitcher = () => {
    const { activeAccount, isAuthorized } = useDerivSession();
    const isDemo = activeAccount?.is_virtual;
    const { openModal } = useQueryParams();

    const { regulationFlags } = useRegulationFlags();
    const { noRealCRNonEUAccount, noRealMFEUAccount } = regulationFlags;

    const iconCurrency = isDemo ? 'virtual' : activeAccount?.currency ?? 'virtual';
    const isSuccess = Boolean(activeAccount);

    if (noRealCRNonEUAccount || noRealMFEUAccount || !isAuthorized) return null;
    if (!isSuccess && isAuthorized) return <CurrencySwitcherLoader />;

    const { icon, text } = IconToCurrencyMapper[iconCurrency];

    const displayBalance = activeAccount
        ? `${activeAccount.balance?.toFixed?.(2) ?? activeAccount.balance} ${activeAccount.currency}`
        : undefined;

    return (
        <div className='flex items-center justify-between w-full gap-16 p-16 border-solid rounded-default border-1 border-system-light-active-background lg:w-auto lg:shrink-0'>
            <div className='flex-none '>{icon}</div>
            <div className='grow'>
                {isDemo ? (
                    <DemoCurrencySwitcherAccountInfo displayBalance={displayBalance} />
                ) : (
                    <RealCurrencySwitcherAccountInfo
                        currencyText={text}
                        displayBalance={displayBalance}
                    />
                )}
            </div>
            <div className='flex-none'>
                <AccountActionButton balance={activeAccount?.balance ?? 0} isDemo={Boolean(isDemo)} />
            </div>
            {!isDemo && (
                <StandaloneChevronDownBoldIcon
                    className='flex-none cursor-pointer'
                    onClick={() => {
                        openModal('AccountSelector');
                    }}
                />
            )}
        </div>
    );
};
