import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, className, id, ...props }, ref) => (
  <div>
    {label && (
      <label className="label" htmlFor={id}>
        {label}
      </label>
    )}
    <input ref={ref} id={id} className={cn('input', className)} {...props} />
  </div>
))
Input.displayName = 'Input'

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }
>(({ label, className, id, ...props }, ref) => (
  <div>
    {label && (
      <label className="label" htmlFor={id}>
        {label}
      </label>
    )}
    <textarea ref={ref} id={id} className={cn('input min-h-[90px] resize-y', className)} {...props} />
  </div>
))
Textarea.displayName = 'Textarea'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, className, id, children, ...props }, ref) => (
    <div>
      {label && (
        <label className="label" htmlFor={id}>
          {label}
        </label>
      )}
      <select ref={ref} id={id} className={cn('input cursor-pointer', className)} {...props}>
        {children}
      </select>
    </div>
  )
)
Select.displayName = 'Select'
