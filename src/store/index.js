import { configureStore } from '@reduxjs/toolkit'
import authReducer          from './authSlice'
import notificationsReducer from './notificationsSlice'

export const store = configureStore({
  reducer: {
    auth:          authReducer,
    notifications: notificationsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
  devTools: import.meta.env.DEV,
})

export default store