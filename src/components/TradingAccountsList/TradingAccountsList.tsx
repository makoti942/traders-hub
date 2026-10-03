import { twMerge } from 'tailwind-merge';

import { Text } from '@deriv-com/ui';

import { IconComponent } from '@/components';
import { IconToCurrencyMapper } from '@/constants';
import { useActiveDerivTradingAccount, useDerivSession, useDerivTradingAccountsList, useQueryParams, useRegulationFlags } from '@/hooks';
import { startPerformanceEventTimer } from '@/utils';

export const TradingAccountsList = () => {
    const { data: tradingAccountsList } = useDerivTradingAccountsList();
    const { data: activeAccount } = useActiveDerivTradingAccount();
    const { switchAccount } = useDerivSession();
    const { regulationFlags } = useRegulationFlags();
    const { isEU } = regulationFlags;
    const { closeModal } = useQueryParams();

    const handleSwitchAccount = (loginid: string) => {
        startPerformanceEventTimer('switch_currency_accounts_time');
        switchAccount(loginid);
        closeModal();
    };

    return (
        <div className='lg:w-[500px] lg:h-[350px] rounded-default'>
            <div className='flex flex-col items-start self-stretch gap-4 p-8'>
                {tradingAccountsList
                    ?.filter(account => !account.is_virtual && (isEU ? account.broker === 'MF' : account.broker === 'CR'))
                    .map(account => {
                        const iconCurrency = account.currency || 'USD';
                        const mapper = IconToCurrencyMapper[iconCurrency] || IconToCurrencyMapper.USD;
                        return (
                            <button
                                className={twMerge(
                                    'flex items-center self-stretch py-8 px-16 gap-16 rounded-xs cursor-pointer hover:bg-system-light-active-background',
                                    activeAccount?.loginid === account.loginid && 'bg-system-light-active-background'
                                )}
                                key={`trading-accounts-list-${account.loginid}`}
                                onClick={() => handleSwitchAccount(String(account.loginid))}
                            >
                                <IconComponent height={35} icon={iconCurrency} width={35} />
                                <div className='flex flex-col items-start flex-1'>
                                    <Text size='sm'>{mapper?.text || iconCurrency}</Text>
                                    <Text size='sm'>{account.loginid}</Text>
                                </div>
                                <div className='text-right'>
                                    <Text size='sm'>{account.displayBalance}</Text>
                                </div>
                            </button>
                        );
                    })}
            </div>
        </div>
    );
};
