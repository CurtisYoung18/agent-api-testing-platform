import { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { BeakerIcon, CpuChipIcon, ClockIcon } from '@heroicons/react/24/outline'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const navItems = [
    { to: '/test', label: '测试', icon: BeakerIcon },
    { to: '/agents', label: 'Agents', icon: CpuChipIcon },
    { to: '/history', label: '历史记录', icon: ClockIcon },
  ]

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="glass-card sticky top-0 z-50 border-b border-primary-200/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center shadow-md">
                <BeakerIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-semibold text-text-primary">
                测试平台
              </span>
            </div>

            {/* Nav Links */}
            <div className="flex items-center space-x-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-400 text-white shadow-md'
                        : 'text-text-secondary hover:bg-primary-50 hover:text-primary-600'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}

