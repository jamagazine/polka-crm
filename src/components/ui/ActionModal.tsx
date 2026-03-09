import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../ui/utils';

interface ActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    inputPlaceholder?: string;
    inputValue?: string;
    onInputChange?: (value: string) => void;
    confirmText: string;
    cancelText?: string;
    onConfirm: () => void;
    isDestructive?: boolean;
}

export function ActionModal({
    isOpen,
    onClose,
    title,
    description,
    inputPlaceholder,
    inputValue,
    onInputChange,
    confirmText,
    cancelText = 'Отмена',
    onConfirm,
    isDestructive = false
}: ActionModalProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsMounted(true);
            document.body.style.overflow = 'hidden';
        } else {
            setTimeout(() => setIsMounted(false), 200);
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen && !isMounted) return null;

    return (
        <div
            className={cn(
                "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0 transition-opacity duration-200",
                isOpen ? "opacity-100" : "opacity-0"
            )}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Dialog */}
            <div
                className={cn(
                    "relative bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden transform transition-all duration-200",
                    isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <h3 className="text-sm font-semibold text-foreground">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 rounded-md hover:bg-muted/50"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-4 py-4">
                    {description && (
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                            {description}
                        </p>
                    )}

                    {onInputChange && (
                        <input
                            type="text"
                            autoFocus
                            className="w-full h-9 px-3 rounded-md border border-border bg-transparent text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                            placeholder={inputPlaceholder}
                            value={inputValue}
                            onChange={(e) => onInputChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    onConfirm();
                                }
                            }}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-4 py-3 bg-muted/20 border-t border-border mt-auto">
                    <button
                        onClick={onClose}
                        className="h-8 px-3 text-xs font-medium text-foreground bg-white border border-border rounded-md hover:bg-muted/50 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={cn(
                            "h-8 px-3 text-xs font-medium text-white rounded-md transition-colors shadow-sm",
                            isDestructive
                                ? "bg-red-500 hover:bg-red-600"
                                : "bg-primary hover:bg-primary/90"
                        )}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
