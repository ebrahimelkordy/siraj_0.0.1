import React from 'react'
import { LoaderIcon } from 'react-hot-toast'
import { useThemeStore } from '../hooks/useThemestore'
const { theme } = useThemeStore
function PageLoader() {
  return (
    <div className='min-h-screen flex items-center justify-center'>
      <LoaderIcon size={40} className=' animate-spin size-10 text-primary' />

    </div>
  )
}

export default PageLoader