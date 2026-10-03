import { useCallback, useEffect, useState } from 'react';

import {
    connectBalanceSocket,
    getActiveAccount,
    getActiveLoginid,
    isAuthorized as checkAuthorized,
    logout as clearSession,
    readStoredAccounts,
    setActiveLoginid,
    TLiveBalanceState,
} from '@/utils/derivAuth';

export const useDerivSession = () => {
    const [accounts, setAccounts] = useState(() => readStoredAccounts());
    const [activeLoginid, setActiveLogin] = useState(() => getActiveLoginid());
    const [authorized, setAuthorized] = useState(() => checkAuthorized());
    const [live, setLive] = useState<TLiveBalanceState | null>(null);

    const refreshAccounts = useCallback(() => {
        const stored = readStoredAccounts();
        setAccounts(stored);
        setActiveLogin(getActiveLoginid());
        setAuthorized(checkAuthorized());
    }, []);

    const switchAccount = useCallback((loginid: string) => {
        setActiveLoginid(loginid);
        setActiveLogin(loginid);
    }, []);

    const logout = useCallback(() => {
        clearSession();
        setAccounts([]);
        setActiveLogin('');
        setAuthorized(false);
        setLive(null);
    }, []);

    useEffect(() => {
        refreshAccounts();
    }, [refreshAccounts]);

    useEffect(() => {
        if (!authorized) {
            setLive(null);
            return;
        }

        const disconnect = connectBalanceSocket(setLive);
        return disconnect;
    }, [authorized, activeLoginid]);

    const activeAccountBase = accounts.find(a => a.loginid === activeLoginid) || accounts[0] || null;
    const activeBalance = live?.balance ?? 0;

    const activeAccount = activeAccountBase
        ? {
              ...activeAccountBase,
              balance: live?.accountList?.find(a => a.loginid === activeAccountBase.loginid)?.balance ?? activeBalance,
          }
        : null;

    const accountsWithBalance = accounts.map(acc => ({
        ...acc,
        balance: live?.accountList?.find(a => a.loginid === acc.loginid)?.balance ?? (acc.loginid === activeLoginid ? activeBalance : 0),
    }));

    return {
        isAuthorized: authorized,
        accounts: accountsWithBalance,
        activeLoginid: activeAccount?.loginid || activeLoginid,
        activeAccount,
        activeBalance,
        live,
        switchAccount,
        logout,
        refreshAccounts,
        getActiveToken: () => getActiveAccount()?.token || '',
    };
};

export default useDerivSession;
