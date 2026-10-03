import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// eslint-disable-next-line import/no-extraneous-dependencies
import { Analytics } from '@deriv-com/analytics';
import { AppDataProvider, useWebsiteStatus } from '@deriv-com/api-hooks';
import { useDevice } from '@deriv-com/ui';
import { WebSocketUtils } from '@deriv-com/utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { CFDProvider, RealAccountCreationProvider, UIProvider } from '@/providers';
import { startInitPerformanceTimers } from '@/utils';
import { captureOAuthTokensFromUrl } from '@/utils/derivAuth';

import { Header } from './components/Header/Header';
import App from './App';

import './index.css';

const queryClient = new QueryClient();

const AnalyticsConfigurator = () => {
    const { data: websiteStatusData } = useWebsiteStatus();
    const { isDesktop, isMobile, isTablet } = useDevice();
    const { getAppId } = WebSocketUtils;

    useEffect(() => {
        if (websiteStatusData?.clients_country) {
            const clientCountry = websiteStatusData.clients_country;

            if (import.meta.env.VITE_RUDDERSTACK_KEY) {
                const config = {
                    rudderstackKey: import.meta.env.VITE_RUDDERSTACK_KEY,
                };
                Analytics.initialise(config);
                const attributes = {
                    account_type: 'demo',
                    app_id: getAppId(),
                    device_type:
                        (isDesktop && 'Desktop') || (isMobile && 'Mobile') || (isTablet && 'Tablet') || 'Mobile',
                    device_language: navigator.language || 'en-EN',
                    user_language: 'en-EN',
                    country: clientCountry,
                };
                Analytics.setAttributes(attributes);
            }
        }
    }, [getAppId, isDesktop, isMobile, isTablet, websiteStatusData]);

    return null;
};

const container = document.getElementById('root');
const root = container ? ReactDOM.createRoot(container) : null;
startInitPerformanceTimers();

const signupRoute = window.location.pathname === '/signup';

captureOAuthTokensFromUrl();

root?.render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <AppDataProvider>
                <UIProvider>
                    <CFDProvider>
                        <RealAccountCreationProvider>
                            {!signupRoute && <Header />}
                            <App />
                            <AnalyticsConfigurator />
                        </RealAccountCreationProvider>
                    </CFDProvider>
                </UIProvider>
            </AppDataProvider>
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    </React.StrictMode>
);
