import {
    createElement as h,
    FC,
    createContext,
    useContext,
    useState,
    useMemo,
    useEffect,
    lazy as originalLazy,
} from './deps';
import traduki from '@traduki/runtime';

export type Translator = (text: string, args?: Record<string, string | number>) => string;

interface TradukiContextProps {
    readonly locale: string;
    switchTo(locale: string): void;
}

export const TradukiContext = createContext<TradukiContextProps | null>(null);

export function useLocale(): [string, (locale: string) => void] {
    const context = useContext(TradukiContext);

    if (!context) {
        throw new Error(`useLocale must be used within a TradukiProvider`);
    }

    return [context.locale, context.switchTo];
}

export function useTranslator(): Translator {
    const context = useContext(TradukiContext);

    if (!context) {
        throw new Error(`useTranslator must be used within a TradukiProvider`);
    }

    return (key, args = {}) => {
        return traduki.translate(key, args);
    };
}

interface TradukiProviderProps {
    initialLocale: string;
}

/*
 * Application provider needed for the provided hooks
 * During initialization it loads the locale based messages files.
 */
export const TradukiProvider: FC<TradukiProviderProps> = ({ initialLocale, children }) => {
    const [locale, setLocale] = useState<string | null>(() => {
        return traduki.currentLocale === initialLocale ? initialLocale : null;
    });

    const subscriber = useMemo(() => {
        return traduki.subscribe(() => {
            if (traduki.currentLocale === locale) return;

            setLocale(traduki.currentLocale);
        });
    }, []);

    useEffect(() => {
        if (!traduki.currentLocale) traduki.switchTo(initialLocale);

        return subscriber;
    }, [subscriber]);

    const context = useMemo(
        () => ({
            get locale() {
                return traduki.currentLocale;
            },
            switchTo(locale: string) {
                traduki.switchTo(locale);
            },
        }),
        [locale],
    );

    if (!context.locale) return null;

    return (
        <TradukiContext.Provider value={context as TradukiContextProps}>
            {children}
        </TradukiContext.Provider>
    );
};

/**
 * Wrapper around lazy
 * It loads the locale based messages files before resolving the import factory promise
 * @deprecated Use waitForMessages instead.
 */
export const lazy: typeof originalLazy = factory => {
    return originalLazy(() => factory().then(result => traduki.ready().then(() => result)));
};

/**
 * Chain to import promise to make sure the messages in the chunks are also loaded.
 * e.g.
 * `React.lazy(() => import('./component.jsx').then(waitForMessages));`
 */
export const waitForMessages = <T extends any>(previous: T): Promise<T> => {
    return traduki.ready().then(() => previous);
};

/*
 * The default export is the traduki runtime
 * Use this as runtimeModuleId `@traduki/(p)react` in the rollup/vite/webpack plugin
 */
export default traduki;
