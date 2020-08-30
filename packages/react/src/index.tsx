import * as React from 'react';
import traduki from '@traduki/runtime';

export type Translator = (
    text: string,
    args?: Record<string, string | number>,
) => string;

interface TradukiContextProps {
    locale: string | null;
    setLocale(locale: string): void;
}

export const TradukiContext = React.createContext<TradukiContextProps | null>(
    null,
);

export function useLocale(): [string | null, (locale: string) => void] {
    const context = React.useContext(TradukiContext);
    if (!context) {
        throw new Error(`useLocale must be used within a TradukiProvider`);
    }

    return [context.locale, context.setLocale];
}

export function useTranslator(): Translator {
    const context = React.useContext(TradukiContext);

    if (!context) {
        throw new Error(
            `useTranslator must be used within a TradukiProvider`,
        );
    }

    return (key, args = {}) => {
        return traduki.translate(key, args);
    };
}

interface TradukiProviderProps {
    initialLocale: string;
}

/*
 * Application provider needed for the provided react hooks
 * During initialization it loads the locale based messages files.
 */
export const TradukiProvider: React.FC<TradukiProviderProps> = ({
    initialLocale,
    children,
}) => {
    const [locale, setLocale] = React.useState<string | null>(() => {
        return null;
    });

    const updateLocale = (locale: string) => {
        traduki.setLocale(locale);
        traduki.load().then(() => {
            setLocale(locale);
        });
    }
    React.useMemo(() => {
        updateLocale(initialLocale);
    }, []);

    const context: TradukiContextProps = React.useMemo(() => {
        return {
            locale,
            setLocale(locale: string) {
                updateLocale(locale);
            },
        };
    }, [locale]);

    React.useEffect(() => {
        if (context.locale) document.querySelector('html')!.setAttribute('lang', context.locale);
    }, [context]);

    if (!context.locale) return null;

    return (
        <TradukiContext.Provider value={context}>
            {children}
        </TradukiContext.Provider>
    );
};

/*
 * Wrapper around React.lazy
 * It loads the locale based messages files before resolving the import factory promise
 */
export const lazy: typeof React.lazy = factory => {
    return React.lazy(() => factory().then(result => traduki.load().then(() => result)));
}

/*
 * The default export is the traduki runtime
 * Use this as runtimeModuleId `@traduki/react` in the rollup/vite/webpack plugin
 */
export default traduki;
