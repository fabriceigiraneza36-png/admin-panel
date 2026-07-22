import { useEffect } from 'react'

const APP_NAME = 'Travel Admin'

/**
 * Sets the browser tab title.
 * @param {string} title — page-specific title (e.g. "Dashboard")
 */
export default function usePageTitle(title) {
    useEffect(() => {
        const prev = document.title
        document.title = title ? `${title} | ${APP_NAME}` : APP_NAME
        return () => {
            document.title = prev
        }
    }, [title])
}