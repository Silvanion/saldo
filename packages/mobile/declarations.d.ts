declare module 'react' {
  export = React;
  export as namespace React;
  namespace React {
    export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
    export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
    export function useMemo<T>(factory: () => T, deps: readonly any[] | undefined): T;
    export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;
    export type ReactNode = any;
    export type FC<P = {}> = (props: P) => any;
  }
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module 'react-native' {
  export const View: any;
  export const Text: any;
  export const StyleSheet: { create: <T>(styles: T) => T };
  export const TouchableOpacity: any;
  export const ScrollView: any;
  export const FlatList: any;
  export const TextInput: any;
  export const RefreshControl: any;
  export const KeyboardAvoidingView: any;
  export const Platform: { OS: 'ios' | 'android' | 'web' };
}

declare module 'expo-router' {
  export const Stack: any;
  export const Tabs: any;
  export function useRouter(): { push: (path: string) => void; back: () => void };
}

declare module 'expo-status-bar' {
  export const StatusBar: any;
}

declare module 'react-native-safe-area-context' {
  export const SafeAreaProvider: any;
  export const SafeAreaView: any;
}

declare module 'expo-haptics' {
  export enum ImpactFeedbackStyle {
    Light = 'light',
    Medium = 'medium',
    Heavy = 'heavy',
  }
  export enum NotificationFeedbackType {
    Success = 'success',
    Warning = 'warning',
    Error = 'error',
  }
  export function impactAsync(style?: ImpactFeedbackStyle): Promise<void>;
  export function notificationAsync(type?: NotificationFeedbackType): Promise<void>;
  export function selectionAsync(): Promise<void>;
}

declare module 'expo-local-authentication' {
  export enum AuthenticationType {
    FINGERPRINT = 1,
    FACIAL_RECOGNITION = 2,
    IRIS = 3,
  }
  export interface LocalAuthenticationResult {
    success: boolean;
    error?: string;
  }
  export function hasHardwareAsync(): Promise<boolean>;
  export function isEnrolledAsync(): Promise<boolean>;
  export function supportedAuthenticationTypesAsync(): Promise<AuthenticationType[]>;
  export function authenticateAsync(options?: {
    promptMessage?: string;
    cancelLabel?: string;
    fallbackLabel?: string;
    disableDeviceFallback?: boolean;
  }): Promise<LocalAuthenticationResult>;
}

declare module 'expo-secure-store' {
  export const WHEN_UNLOCKED_THIS_DEVICE_ONLY: number;
  export function getItemAsync(key: string): Promise<string | null>;
  export function setItemAsync(key: string, value: string, options?: any): Promise<void>;
  export function deleteItemAsync(key: string): Promise<void>;
}

declare module 'expo-sqlite' {
  export interface SQLiteDatabase {
    execAsync(sql: string): Promise<void>;
    runAsync(sql: string, params?: any[]): Promise<any>;
    getAllAsync<T = any>(sql: string, params?: any[]): Promise<T[]>;
  }
  export function openDatabaseAsync(databaseName: string): Promise<SQLiteDatabase>;
}

declare module 'lucide-react-native' {
  export const LayoutDashboard: any;
  export const ReceiptText: any;
  export const PieChart: any;
  export const Landmark: any;
  export const PlusCircle: any;
  export const TrendingDown: any;
  export const TrendingUp: any;
  export const ShieldAlert: any;
  export const Sparkles: any;
  export const ArrowUpRight: any;
  export const ArrowDownLeft: any;
  export const Search: any;
  export const Filter: any;
  export const Calculator: any;
  export const ShieldCheck: any;
  export const AlertCircle: any;
  export const Home: any;
  export const Award: any;
  export const Check: any;
  export const X: any;
}
