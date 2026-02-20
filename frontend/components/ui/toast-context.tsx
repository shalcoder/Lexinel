"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    addToast: (message: string, type: ToastType) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto-dismiss
        setTimeout(() => removeToast(id), 5000);
    }, [removeToast]);

    const success = (msg: string) => addToast(msg, 'success');
    const error = (msg: string) => addToast(msg, 'error');
    const info = (msg: string) => addToast(msg, 'info');
    const warning = (msg: string) => addToast(msg, 'warning');

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const getStyles = (type: ToastType) => {
        switch (type) {
            case 'success': return "border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 text-green-900 dark:text-green-100";
            case 'error': return "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-red-900 dark:text-red-100";
            case 'warning': return "border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 text-amber-900 dark:text-amber-100";
            default: return "border-blue-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100";
        }
    };

    return (
        <ToastContext.Provider value={{ addToast, success, error, info, warning }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            className={cn(
                                "pointer-events-auto min-w-[300px] max-w-md p-4 rounded-lg shadow-lg border flex items-start gap-3 backdrop-blur-sm",
                                getStyles(toast.type)
                            )}
                        >
                            <div className="shrink-0 mt-0.5">{getIcon(toast.type)}</div>
                            <p className="text-sm font-medium leading-relaxed">{toast.message}</p>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="shrink-0 opacity-50 hover:opacity-100 transition-opacity ml-auto"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
