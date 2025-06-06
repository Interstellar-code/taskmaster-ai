import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FormButtonProps extends ButtonProps {
	loading?: boolean;
	loadingText?: string;
	icon?: React.ReactNode;
	iconPosition?: 'left' | 'right';
	fullWidth?: boolean;
}

/**
 * Enhanced form button component with loading states and icons
 *
 * Features:
 * - Loading state with spinner
 * - Icon support with positioning
 * - Full width option
 * - All standard button variants and sizes
 * - Form-specific styling and behavior
 */
export function FormButton({
	children,
	loading = false,
	loadingText,
	icon,
	iconPosition = 'left',
	fullWidth = false,
	disabled,
	className,
	...props
}: FormButtonProps) {
	const isDisabled = disabled || loading;

	const renderIcon = () => {
		if (loading) {
			return <Loader2 className="h-4 w-4 animate-spin" />;
		}
		return icon;
	};

	const renderContent = () => {
		const text = loading && loadingText ? loadingText : children;
		const iconElement = renderIcon();

		if (!iconElement) {
			return text;
		}

		return (
			<div className="flex items-center gap-2">
				{iconPosition === 'left' && iconElement}
				{text}
				{iconPosition === 'right' && iconElement}
			</div>
		);
	};

	return (
		<Button
			{...props}
			disabled={isDisabled}
			className={cn(
				fullWidth && 'w-full',
				loading && 'cursor-not-allowed',
				className
			)}
		>
			{renderContent()}
		</Button>
	);
}

FormButton.displayName = 'FormButton';
