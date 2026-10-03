export type TDerivOAuthAccount = {
    account: string;
    token: string;
    currency: string;
};

export type TDerivStoredAccount = {
    loginid: string;
    token: string;
    currency: string;
    is_virtual: boolean;
};

const ACCOUNTS_KEY = 'client.accounts';
const ACTIVE_LOGIN_KEY = 'active_loginid';
const ACCOUNT_TYPE_KEY = 'account_type';
const DEFAULT_APP_ID = '33UD5Xga7WHSzXFtBYdmr';

export const isDemoLoginid = (loginid: string): boolean =>
    /^(VRT|VRW|DEM|DOT|CR9|CRW)/.test(loginid) ||
    loginid.startsWith('VRT') ||
    loginid.startsWith('VRW') ||
    loginid.startsWith('DEM') ||
    loginid.startsWith('DOT');

export const getAppId = (): string => {
    try {
        return localStorage.getItem('config.app_id') || DEFAULT_APP_ID;
    } catch {
        return DEFAULT_APP_ID;
    }
};

export const getSocketUrl = (loginid?: string): string => {
    try {
        const configured = localStorage.getItem('config.server_url');
        if (configured) {
            const host = configured.replace(/^wss?:\/\//, '').split('/')[0];
            return `wss://${host}/websockets/v3?app_id=${getAppId()}`;
        }
    } catch {}

    const id = loginid || getActiveLoginid() || '';
    if (id && !isDemoLoginid(id)) {
        return `wss://green.derivws.com/websockets/v3?app_id=${getAppId()}`;
    }
    return `wss://blue.derivws.com/websockets/v3?app_id=${getAppId()}`;
};

export const getOAuthLoginUrl = (): string => {
    const appId = getAppId();
    return `https://oauth.deriv.com/oauth2/authorize?app_id=${encodeURIComponent(appId)}&l=en`;
};

export const parseOAuthRedirect = (search: string): TDerivOAuthAccount[] => {
    const params = new URLSearchParams(search);
    const accounts: TDerivOAuthAccount[] = [];

    for (let i = 1; i <= 10; i += 1) {
        const account = params.get(`acct${i}`);
        const token = params.get(`token${i}`);
        const currency = params.get(`cur${i}`) || 'USD';
        if (account && token) {
            accounts.push({ account, token, currency: currency.toUpperCase() });
        }
    }

    return accounts;
};

const toStoredAccounts = (oauthAccounts: TDerivOAuthAccount[]): TDerivStoredAccount[] =>
    oauthAccounts.map(({ account, token, currency }) => ({
        loginid: account,
        token,
        currency,
        is_virtual: isDemoLoginid(account),
    }));

const writeCookie = (name: string, value: string) => {
    try {
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax${secure}`;
    } catch {}
};

export const storeOAuthAccounts = (oauthAccounts: TDerivOAuthAccount[]): TDerivStoredAccount[] => {
    const stored = toStoredAccounts(oauthAccounts);
    if (!stored.length) return stored;

    const byLoginid: Record<string, string> = {};
    stored.forEach(acc => {
        byLoginid[acc.loginid] = acc.token;
    });

    const accountsMap: Record<string, Omit<TDerivStoredAccount, 'token'>> = {};
    stored.forEach(acc => {
        accountsMap[acc.loginid] = {
            loginid: acc.loginid,
            currency: acc.currency,
            is_virtual: acc.is_virtual,
        };
    });

    try {
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accountsMap));
        localStorage.setItem('accountsList', JSON.stringify(byLoginid));
        localStorage.setItem(ACTIVE_LOGIN_KEY, stored[0].loginid);
        localStorage.setItem(ACCOUNT_TYPE_KEY, stored[0].is_virtual ? 'demo' : 'real');
        writeCookie(ACCOUNTS_KEY, JSON.stringify(accountsMap));
        writeCookie(ACTIVE_LOGIN_KEY, stored[0].loginid);
    } catch {}

    return stored;
};

export const readStoredAccounts = (): TDerivStoredAccount[] => {
    try {
        const rawAccounts = localStorage.getItem(ACCOUNTS_KEY);
        const rawTokens = localStorage.getItem('accountsList');
        if (!rawAccounts || !rawTokens) return [];

        const accountsMap = JSON.parse(rawAccounts) as Record<
            string,
            { loginid?: string; currency?: string; is_virtual?: boolean }
        >;
        const tokensMap = JSON.parse(rawTokens) as Record<string, string>;

        return Object.entries(accountsMap).map(([loginid, meta]) => ({
            loginid,
            token: tokensMap[loginid] || '',
            currency: (meta.currency || 'USD').toUpperCase(),
            is_virtual: meta.is_virtual ?? isDemoLoginid(loginid),
        }));
    } catch {
        return [];
    }
};

export const getActiveLoginid = (): string => {
    try {
        return localStorage.getItem(ACTIVE_LOGIN_KEY) || '';
    } catch {
        return '';
    }
};

export const getActiveToken = (): string => {
    const loginid = getActiveLoginid();
    const accounts = readStoredAccounts();
    return accounts.find(a => a.loginid === loginid)?.token || accounts[0]?.token || '';
};

export const getActiveAccount = (): TDerivStoredAccount | null => {
    const loginid = getActiveLoginid();
    const accounts = readStoredAccounts();
    return accounts.find(a => a.loginid === loginid) || accounts[0] || null;
};

export const isAuthorized = (): boolean => {
    const accounts = readStoredAccounts();
    return accounts.some(a => Boolean(a.token));
};

export const setActiveLoginid = (loginid: string) => {
    try {
        localStorage.setItem(ACTIVE_LOGIN_KEY, loginid);
        const account = readStoredAccounts().find(a => a.loginid === loginid);
        if (account) {
            localStorage.setItem(ACCOUNT_TYPE_KEY, account.is_virtual ? 'demo' : 'real');
            writeCookie(ACTIVE_LOGIN_KEY, loginid);
        }
    } catch {}
};

export const logout = () => {
    try {
        localStorage.removeItem(ACCOUNTS_KEY);
        localStorage.removeItem('accountsList');
        localStorage.removeItem(ACTIVE_LOGIN_KEY);
        localStorage.removeItem(ACCOUNT_TYPE_KEY);
        document.cookie = `${ACCOUNTS_KEY}=; path=/; max-age=0`;
        document.cookie = `${ACTIVE_LOGIN_KEY}=; path=/; max-age=0`;
    } catch {}
};

export type TLiveBalanceState = {
    balance: number;
    currency: string;
    loginid: string;
    accountList: Array<{ loginid: string; currency: string; is_virtual: boolean; balance: number }>;
};

export const connectBalanceSocket = (
    onUpdate: (state: TLiveBalanceState) => void,
    onError?: (error: unknown) => void
): (() => void) => {
    const account = getActiveAccount();
    if (!account?.token) {
        onError?.(new Error('No OAuth token stored'));
        return () => {};
    }

    let socket: WebSocket | null = null;
    let closed = false;
    let reqId = 1;
    const balances: Record<string, number> = {};

    const send = (payload: Record<string, unknown>) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ ...payload, req_id: reqId++ }));
        }
    };

    const emit = () => {
        const active = getActiveLoginid() || account.loginid;
        const loginAccounts = readStoredAccounts().map(a => ({
            loginid: a.loginid,
            currency: a.currency,
            is_virtual: a.is_virtual,
            balance: balances[a.loginid] ?? 0,
        }));

        onUpdate({
            balance: balances[active] ?? 0,
            currency: account.currency,
            loginid: active,
            accountList: loginAccounts,
        });
    };

    try {
        socket = new WebSocket(getSocketUrl(account.loginid));

        socket.onopen = () => {
            send({ authorize: account.token });
        };

        socket.onmessage = event => {
            try {
                const data = JSON.parse(event.data as string);

                if (data.error) {
                    onError?.(data.error);
                    return;
                }

                if (data.authorize) {
                    const authorize = data.authorize;
                    const list = authorize.account_list || [];
                    list.forEach((acc: { loginid: string; currency?: string; is_virtual?: number }) => {
                        if (!balances[acc.loginid] && acc.loginid === authorize.loginid) {
                            balances[acc.loginid] = Number(authorize.balance ?? 0);
                        }
                    });
                    send({ balance: 1, subscribe: 1 });
                    emit();
                    return;
                }

                if (data.balance) {
                    const loginid = data.balance.loginid || getActiveLoginid();
                    balances[loginid] = Number(data.balance.balance ?? 0);
                    emit();
                }
            } catch (err) {
                onError?.(err);
            }
        };

        socket.onerror = err => onError?.(err);
    } catch (err) {
        onError?.(err);
    }

    return () => {
        closed = true;
        try {
            socket?.close();
        } catch {}
        if (closed) socket = null;
    };
};
