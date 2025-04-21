import { XCircleIcon, ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/20/solid'
import React from 'react';

interface AlertProps {
    title: string;
    messages: string[];
    variant?: 'error' | 'warning' | 'success' | 'info';
    isVisible: boolean;
}

const variantConfig = {
    error: {
        icon: XCircleIcon,
        iconColor: 'text-red-500',
        bgColor: 'bg-[#1f1f1f]',
        borderColor: 'border-red-500/10'
    },
    warning: {
        icon: ExclamationTriangleIcon,
        iconColor: 'text-yellow-500',
        bgColor: 'bg-[#1f1f1f]',
        borderColor: 'border-yellow-500/10'
    },
    success: {
        icon: CheckCircleIcon,
        iconColor: 'text-green-500',
        bgColor: 'bg-[#1f1f1f]',
        borderColor: 'border-green-500/10'
    },
    info: {
        icon: InformationCircleIcon,
        iconColor: 'text-blue-500',
        bgColor: 'bg-[#1f1f1f]',
        borderColor: 'border-blue-500/10'
    }
};

export function Alert({ title, messages, variant = 'info', isVisible }: AlertProps) {
    const config = variantConfig[variant];
    const Icon = config.icon;

    return (
        <div 
            data-testid={`alert-${variant}`}
            className={`
                fixed top-4 right-4 z-50 rounded-md p-4 
                transition-all duration-300 ease-in-out
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
                ${config.bgColor} text-white border-[0.5px] border-white/10
                shadow-[0_0_1px_rgba(255,255,255,0.1)]
                z-[10000]
            `}
            style={{ maxWidth: '400px' }}
        >
            <div className="flex">
                <div className="flex-shrink-0">
                    <Icon className={`h-5 w-5 ${config.iconColor}`} aria-hidden="true" />
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-medium">{title}</h3>
                    {messages.length > 0 && (
                        <div className="mt-2 text-sm">
                            <ul className="list-disc space-y-1 pl-5">
                                {messages.map((message, index) => (
                                    <li key={index}>{message}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
