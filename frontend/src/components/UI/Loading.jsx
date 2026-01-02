/**
 * Loading Component with various styles and states
 * Reusable loading indicator for different contexts
 */

import PropTypes from 'prop-types'

const LoadingSpinner = ({ size = 'medium', color = 'blue', className = '' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8', 
    large: 'w-12 h-12',
    xlarge: 'w-16 h-16'
  }

  const colorClasses = {
    blue: 'border-blue-600',
    white: 'border-white',
    gray: 'border-gray-600',
    green: 'border-green-600',
    red: 'border-red-600'
  }

  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        border-2 
        ${colorClasses[color]} 
        border-t-transparent 
        rounded-full 
        animate-spin
        ${className}
      `}
    />
  )
}

const LoadingComponent = ({ 
  message = 'Loading...', 
  fullScreen = false, 
  transparent = false,
  spinner = true,
  size = 'medium'
}) => {
  const containerClasses = fullScreen 
    ? 'fixed inset-0 z-50 flex items-center justify-center'
    : 'flex items-center justify-center p-8'

  const backgroundClasses = transparent
    ? 'bg-white/80 backdrop-blur-sm'
    : 'bg-white'

  return (
    <div className={`${containerClasses} ${backgroundClasses}`}>
      <div className=\"flex flex-col items-center space-y-4\">
        {spinner && (
          <LoadingSpinner 
            size={size} 
            color={fullScreen ? 'blue' : 'blue'}
          />
        )}
        {message && (
          <p className=\"text-gray-600 text-sm font-medium animate-pulse\">
            {message}
          </p>
        )}
      </div>
    </div>
  )
}

// API Loading component for data fetching
export const ApiLoadingState = ({ 
  isLoading, 
  error, 
  children, 
  loadingMessage = 'Memuat data...',
  errorMessage = 'Terjadi kesalahan saat memuat data',
  onRetry 
}) => {
  if (error) {
    return (
      <div className=\"flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200\">
        <div className=\"w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4\">
          <svg className=\"w-6 h-6 text-red-600\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
            <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z\" />
          </svg>
        </div>
        <p className=\"text-red-700 text-center mb-4\">{errorMessage}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className=\"px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors\"
          >
            Coba Lagi
          </button>
        )}
      </div>
    )
  }

  if (isLoading) {
    return <LoadingComponent message={loadingMessage} />
  }

  return children
}

// Page Loading component
export const PageLoading = ({ message = 'Memuat halaman...' }) => (
  <LoadingComponent 
    message={message}
    fullScreen={true}
    transparent={true}
    size=\"large\"
  />
)

// Button Loading component
export const ButtonLoading = ({ isLoading, children, loadingText = 'Memproses...', ...props }) => (
  <button 
    {...props} 
    disabled={isLoading || props.disabled}
    className={`${props.className} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
  >
    {isLoading ? (
      <div className=\"flex items-center justify-center space-x-2\">
        <LoadingSpinner size=\"small\" color=\"white\" />
        <span>{loadingText}</span>
      </div>
    ) : (
      children
    )}
  </button>
)

// Socket.IO Connection Status
export const ConnectionStatus = ({ isConnected, isConnecting, error }) => {
  if (error) {
    return (
      <div className=\"fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50\">
        <div className=\"flex items-center space-x-2\">
          <div className=\"w-2 h-2 bg-red-300 rounded-full animate-pulse\" />
          <span className=\"text-sm font-medium\">Koneksi bermasalah</span>
        </div>
      </div>
    )
  }

  if (isConnecting) {
    return (
      <div className=\"fixed top-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg z-50\">
        <div className=\"flex items-center space-x-2\">
          <LoadingSpinner size=\"small\" color=\"white\" />
          <span className=\"text-sm font-medium\">Menghubungkan...</span>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className=\"fixed top-4 right-4 bg-gray-500 text-white px-4 py-2 rounded-lg shadow-lg z-50\">
        <div className=\"flex items-center space-x-2\">
          <div className=\"w-2 h-2 bg-gray-300 rounded-full\" />
          <span className=\"text-sm font-medium\">Terputus</span>
        </div>
      </div>
    )
  }

  return (
    <div className=\"fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 opacity-0 transition-opacity duration-1000\">
      <div className=\"flex items-center space-x-2\">
        <div className=\"w-2 h-2 bg-green-300 rounded-full\" />
        <span className=\"text-sm font-medium\">Terhubung</span>
      </div>
    </div>
  )
}

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large', 'xlarge']),
  color: PropTypes.oneOf(['blue', 'white', 'gray', 'green', 'red']),
  className: PropTypes.string
}

LoadingComponent.propTypes = {
  message: PropTypes.string,
  fullScreen: PropTypes.bool,
  transparent: PropTypes.bool,
  spinner: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large', 'xlarge'])
}

ApiLoadingState.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  children: PropTypes.node.isRequired,
  loadingMessage: PropTypes.string,
  errorMessage: PropTypes.string,
  onRetry: PropTypes.func
}

PageLoading.propTypes = {
  message: PropTypes.string
}

ButtonLoading.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
  loadingText: PropTypes.string,
  className: PropTypes.string
}

ConnectionStatus.propTypes = {
  isConnected: PropTypes.bool,
  isConnecting: PropTypes.bool,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
}

export default LoadingComponent