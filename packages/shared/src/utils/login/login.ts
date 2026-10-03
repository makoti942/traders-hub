import {
    getAuthBaseUrl,
    getOAuthAppId,
    getOAuthClientId,
    getOAuthClassicBaseUrl,
    getOAuthRedirectUri,
    getSignupUrl,
} from '../brand';

// ---------------------------------------------------------------------------
// PKCE helpers (duplicated here to avoid circular dependency with core)
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

const storePKCEVerifier = (verifier: string): void => {
    sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
    sessionStorage.setItem(PKCE_EXPIRY_KEY, String(Date.now()));
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Redirects to the OAuth2 authorize endpoint.
 * PKCE (auth.deriv.com) when OAUTH_CLIENT_ID is set; classic oauth.deriv.com
 * app_id flow otherwise. Uses window.location.replace() so the authorize URL
 * does not appear in browser history.
 */
export const redirectToLogin = async (_language?: string): Promise<void> => {
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
        window.location.replace(`${getOAuthClassicBaseUrl()}/oauth2/authorize?${params}`);
        return;
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

    const auth_url = `${getAuthBaseUrl()}/oauth2/auth?${params}`;
    window.location.replace(auth_url);
};

export const redirectToSignUp = (_language?: string): void => {
    const signup_url = getSignupUrl();
    if (signup_url) window.open(signup_url, '_blank', 'noopener,noreferrer');
};
