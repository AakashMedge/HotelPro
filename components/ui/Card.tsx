import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    hover?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className = '', hover = true, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`premium-card p-6 ${hover ? 'hover:translate-y-[-4px]' : ''} ${className}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = 'Card';

export default Card;
