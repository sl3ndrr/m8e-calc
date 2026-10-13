import type { HTMLAttributes } from 'react';
import './Card.css';
export interface CardProps extends HTMLAttributes<HTMLElement> {
  variant?: 'filled' | 'elevated' | 'outlined';
}
/** Put interactive actions inside the card; the container itself is not a button. */
export function Card({
  variant = 'filled',
  className = '',
  ...props
}: CardProps) {
  return (
    <article
      {...props}
      className={`ui-card ${className}`}
      data-variant={variant}
    />
  );
}
