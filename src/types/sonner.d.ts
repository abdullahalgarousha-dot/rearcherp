declare module 'sonner' {
    export const toast: {
        success: (message: string | React.ReactNode, data?: any) => void;
        error: (message: string | React.ReactNode, data?: any) => void;
        loading: (message: string | React.ReactNode, data?: any) => void;
        dismiss: (id?: string | number) => void;
        promise: (promise: Promise<any>, data?: any) => void;
        // Add other methods as needed
    };
    export const Toaster: React.FC<any>;
}
