import {
    getAuthBaseUrl,
    getOAuthAppId,
    getOAuthClientId,
    getOAuthClassicBaseUrl,
    getOAuthRedirectUri,
} from '@deriv/shared';

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------

const generateCodeVerifier = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};

const generateCodeChallenge = async (verifier: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};

const PKCE_VERIFIER_KEY = 'oauth_code_verifier';
const PKCE_EXPIRY_KEY = 'oauth_code_verifier_timestamp';
const PKCE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const storePKCEVerifier = (verifier: string): void => {
    sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
    sessionStorage.setItem(PKCE_EXPIRY_KEY, String(Date.now()));
};

export const getPKCEVerifier = (): string | null => {
    const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
    const timestamp = Number(sessionStorage.getItem(PKCE_EXPIRY_KEY) ?? 0);
    if (!verifier || Date.now() - timestamp > PKCE_TTL_MS) {
        sessionStorage.removeItem(PKCE_VERIFIER_KEY);
        sessionStorage.removeItem(PKCE_EXPIRY_KEY);
        return null;
    }
    return verifier;
};

export const clearPKCEVerifier = (): void => {
    sessionStorage.removeItem(PKCE_VERIFIER_KEY);
    sessionStorage.removeItem(PKCE_EXPIRY_KEY);
};

// ---------------------------------------------------------------------------
// OAuth URL generation
// ---------------------------------------------------------------------------

/**
 * Builds the OAuth authorize URL.
 * - PKCE (auth.deriv.com) when OAUTH_CLIENT_ID is set
 * - Classic (oauth.deriv.com + app_id) when only oauth_app_id is configured
 */
export const generateOAuthURL = async (): Promise<string> => {
    const redirect_uri = getOAuthRedirectUri();
    const oauth_app_id = getOAuthAppId();
    const client_id = getOAuthClientId();

    if (!client_id && oauth_app_id) {
        sessionStorage.setItem('oauth_flow', 'classic');
        sessionStorage.setItem('oauth_app_id', oauth_app_id);
        const params = new URLSearchParams({
            app_id: oauth_app_id,
            l: 'en',
        });
        if (redirect_uri) params.set('redirect_uri', redirect_uri);
        return `${getOAuthClassicBaseUrl()}/oauth2/authorize?${params}`;
    }

    if (!client_id) {
        throw new Error('OAuth is not configured: set OAUTH_CLIENT_ID or auth.oauth_app_id in brand.config.json');
    }

    sessionStorage.setItem('oauth_flow', 'pkce');
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    storePKCEVerifier(verifier);

    const csrf_token = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
    sessionStorage.setItem('oauth_csrf_token', csrf_token);

    const params = new URLSearchParams({
        response_type: 'code',
        client_id,
        redirect_uri,
        scope: 'trade',
        state: csrf_token,
        code_challenge: challenge,
        code_challenge_method: 'S256',
    });
    if (oauth_app_id) params.set('app_id', oauth_app_id);

    return `${getAuthBaseUrl()}/oauth2/auth?${params}`;
};

/**
 * Captures classic oauth.deriv.com tokens (token1/acct1/cur1/…) from the
 * redirect URL and stores them for the WebSocket session.
 * Returns true when a token was captured.
 */
export const captureClassicOAuthTokensFromUrl = (): boolean => {
    if (typeof window === 'undefined') return false;

    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const pick = (...keys: string[]) => {
        for (const key of keys) {
            const value = search.get(key) || hash.get(key);
            if (value) return value;
        }
        return '';
    };

    const token = pick('token1', 'token', 'oauth_token');
    if (!token) return false;

    const loginid = pick('acct1', 'acct', 'loginid');
    const currency = pick('cur1', 'cur', 'currency');
    const account_list = pick('account_list');

    // Persist account map for multi-account UIs (loginid -> token/currency)
    const accounts: Record<string, { token: string; currency: string; is_virtual: boolean }> = {};
    if (loginid) {
        accounts[loginid] = {
            token,
            currency: currency || 'USD',
            is_virtual: /^(VRT|DEM)/.test(loginid),
        };
    }
    if (account_list) {
        for (const entry of account_list.split(',')) {
            const [id, cur] = entry.split(':');
            if (!id || accounts[id]) continue;
            accounts[id] = {
                token: id === loginid ? token : token,
                currency: cur || currency || 'USD',
                is_virtual: /^(VRT|DEM)/.test(id),
            };
        }
    }

    sessionStorage.setItem('oauth_flow', 'classic');
    if (oauth_app_id_from_session()) {
        // keep existing
    } else {
        sessionStorage.setItem('oauth_app_id', getOAuthAppId());
    }
    storeTokens(token);
    if (loginid) {
        localStorage.setItem('active_loginid', loginid);
        sessionStorage.setItem('active_loginid', loginid);
        const is_virtual = /^(VRT|DEM)/.test(loginid);
        localStorage.setItem('account_type', is_virtual ? 'demo' : 'real');
    }
    localStorage.setItem('client.accounts', JSON.stringify(accounts));
    sessionStorage.setItem('client.accounts', JSON.stringify(accounts));
    if (currency) {
        localStorage.setItem('account_currency', currency);
    }

    // Strip tokens from the address bar
    const url = new URL(window.location.href);
    for (const key of ['token1', 'token', 'oauth_token', 'acct1', 'acct', 'loginid', 'cur1', 'cur', 'currency', 'account_list', 'code', 'state']) {
        url.searchParams.delete(key);
        // hash keys handled by clearing hash when it contained token params
    }
    if (window.location.hash && /token|acct|cur=/.test(window.location.hash)) {
        url.hash = '';
    }
    window.history.replaceState({}, document.title, url.toString());

    return true;
};

const oauth_app_id_from_session = (): string => sessionStorage.getItem('oauth_app_id') || '';

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

export const exchangeCodeForToken = async (
    code: string
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> => {
    const verifier = getPKCEVerifier();
    if (!verifier) throw new Error('PKCE code verifier not found or expired — restart login flow');

    const response = await fetch(`${getAuthBaseUrl()}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: getOAuthRedirectUri(),
            client_id: getOAuthClientId(),
            code_verifier: verifier,
        }),
    });

    if (!response.ok) throw new Error(`Token exchange failed: ${response.status}`);

    const data = await response.json();
    if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log('[OAuth] Token exchange response:', {
            scope: data.scope,
            token_type: data.token_type,
            expires_in: data.expires_in,
        });
    }
    if (!data.access_token)
        throw new Error(`Token exchange succeeded but no access_token in response: ${JSON.stringify(data)}`);
    clearPKCEVerifier();
    storeTokens(data.access_token, data.refresh_token, data.expires_in);
    return data;
};

// ---------------------------------------------------------------------------
// Token storage
// Access and refresh tokens go in sessionStorage — cleared on tab close.
// active_loginid stays in localStorage for multi-tab account awareness.
// ---------------------------------------------------------------------------

const AUTH_INFO_KEY = 'auth_info';

export const storeTokens = (access_token: string, refresh_token?: string, expires_in?: number): void => {
    sessionStorage.setItem(
        AUTH_INFO_KEY,
        JSON.stringify({
            access_token,
            refresh_token,
            expires_at: expires_in ? Date.now() + expires_in * 1000 : null,
        })
    );
};

export const getStoredToken = (): string | null => {
    try {
        const info = JSON.parse(sessionStorage.getItem(AUTH_INFO_KEY) ?? 'null');
        if (!info) return null;
        if (info.expires_at && Date.now() >= info.expires_at) {
            clearTokens();
            return null;
        }
        return info.access_token ?? null;
    } catch {
        return null;
    }
};

export const clearTokens = (): void => {
    sessionStorage.removeItem(AUTH_INFO_KEY);
};

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

export const refreshAccessToken = async (): Promise<string> => {
    const info = JSON.parse(sessionStorage.getItem(AUTH_INFO_KEY) ?? 'null');
    if (!info?.refresh_token) throw new Error('No refresh token stored');

    const response = await fetch(`${getAuthBaseUrl()}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: info.refresh_token,
            client_id: getOAuthClientId(),
        }),
    });

    if (!response.ok) throw new Error(`Token refresh failed: ${response.status}`);
    const data = await response.json();
    storeTokens(data.access_token, data.refresh_token, data.expires_in);
    return data.access_token;
};
