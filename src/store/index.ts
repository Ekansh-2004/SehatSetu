import { configureStore } from '@reduxjs/toolkit';
import doctorSlice from './slices/doctorSlice';
import patientSlice from './slices/patientSlice';

export const store = configureStore({
  reducer: {
    doctor: doctorSlice,
    patient: patientSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 