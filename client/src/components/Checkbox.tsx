import { CheckIcon } from '@heroicons/react/24/solid'
import { motion, AnimatePresence } from 'framer-motion'

interface CheckboxProps {
  checked: boolean
  onChange: () => void
  label?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Checkbox({ checked, onChange, label, className = '', size = 'md' }: CheckboxProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <motion.div
        className={`relative ${sizeClasses[size]} flex items-center justify-center cursor-pointer`}
        onClick={onChange}
        whileTap={{ scale: 0.9 }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
          aria-label={label || '选择'}
        />
        <motion.div
          className={`${sizeClasses[size]} rounded-md border-2 transition-all duration-200 ${
            checked
              ? 'bg-primary-500 border-primary-500 shadow-md'
              : 'bg-white border-gray-300 hover:border-primary-400'
          }`}
          animate={{
            scale: checked ? 1 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          <AnimatePresence>
            {checked && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <CheckIcon className={`${iconSizes[size]} text-white`} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        {/* Ripple effect */}
        {checked && (
          <motion.div
            className="absolute inset-0 rounded-md bg-primary-200"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </motion.div>
      {label && (
        <label
          onClick={onChange}
          className="cursor-pointer text-text-primary select-none"
        >
          {label}
        </label>
      )}
    </div>
  )
}

