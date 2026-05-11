import { configureStore } from '@reduxjs/toolkit'
import authReducer          from './authSlice'
import notificationsReducer from './notificationsSlice'
import chatReducer          from './chatSlice'

export const store = configureStore({
  reducer: {
    auth:          authReducer,
    notifications: notificationsReducer,
    chat:          chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
  devTools: import.meta.env.DEV,
})

export default store