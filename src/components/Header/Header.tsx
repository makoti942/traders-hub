import { Button } from '@deriv-com/ui';

import { IconComponent } from '..';
import { useDerivSession } from '@/hooks/useDerivSession';
import { getOAuthLoginUrl } from '@/utils/derivAuth';

export const Header = () => {
    const { isAuthorized, logout } = useDerivSession();

    return (
        <header className='border-solid border-b-1 border-b-system-light-hover-background flex px-20 sticky top-0 bg-system-light-primary-background z-50'>
            <div className='flex justify-between items-center w-full'>
                <a
                    onClick={() => {
                        window.location.href = 'https://deriv.com';
                    }}
                    target='_blank'
                    rel='noopener noreferrer'
                >
                    <IconComponent icon='Deriv' className='cursor-pointer' />
                </a>
                {!isAuthorized ? (
                    <div className='flex gap-6'>
                        <Button
                            size='sm'
                            variant='outlined'
                            color='black'
                            onClick={() => {
                                window.location.href = getOAuthLoginUrl();
                            }}
                        >
                            Login
                        </Button>
                        <Button
                            size='sm'
                            onClick={() => {
                                window.location.href = getOAuthLoginUrl();
                            }}
                        >
                            Sign Up
                        </Button>
                    </div>
                ) : (
                    <Button
                        size='sm'
                        variant='outlined'
                        color='black'
                        onClick={() => {
                            logout();
                            window.location.href = getOAuthLoginUrl();
                        }}
                    >
                        Logout
                    </Button>
                )}
            </div>
        </header>
    );
};
