import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'gold' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-garnet-600 to-garnet-500 text-white shadow-glow hover:from-garnet-500 hover:to-garnet-400 focus-visible:ring-garnet-400/50',
  gold: 'bg-gradient-to-br from-gold-500 to-gold-400 text-ink-950 hover:from-gold-400 hover:to-gold-300 hover:shadow-glow focus-visible:ring-gold-400/50',
  ghost: 'border border-ink-700 bg-transparent text-ink-100 hover:border-ink-700 hover:bg-white/5 focus-visible:ring-gold-500/40',
  danger:
    'bg-garnet-700/80 text-garnet-50 hover:bg-garnet-700 border border-garnet-500/40 focus-visible:ring-garnet-400/50'
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
)
Button.displayName = 'Button'
