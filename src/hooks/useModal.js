import { useState, useCallback } from 'react'

export const useModal = (initialOpen = false) => {
  const [isOpen, setIsOpen]   = useState(initialOpen)
  const [data,   setData]     = useState(null)

  const open = useCallback((payload = null) => {
    setData(payload)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    // Delay clearing data for exit animation
    setTimeout(() => setData(null), 200)
  }, [])

  const toggle = useCallback(() => setIsOpen((v) => !v), [])

  return { isOpen, data, open, close, toggle }
}