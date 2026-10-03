import { Navigate, useLocation } from 'react-router-dom';

import { routes } from '@/routes';
import { parseOAuthRedirect, storeOAuthAccounts } from '@/utils/derivAuth';

export const Redirect = () => {
    const { search } = useLocation();
    const urlParams = new URLSearchParams(search);
    const actionParam = urlParams.get('action');
    const verificationCode = urlParams.get('code');

    if (verificationCode) {
        try {
            localStorage.setItem('verification_code', verificationCode);
        } catch {}
    }

    const oauthAccounts = parseOAuthRedirect(search);
    if (oauthAccounts.length) {
        storeOAuthAccounts(oauthAccounts);
    }

    if (actionParam === 'signup') {
        return <Navigate to={routes.signup + search} />;
    }

    return <Navigate to={routes.home} replace />;
};
