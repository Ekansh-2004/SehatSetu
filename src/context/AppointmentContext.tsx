"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

export interface Appointment {
  id: string;
  patientName: string;
  time: string;
  date: string;
  status: "completed" | "scheduled" | "in-progress";
  type: "past" | "upcoming";
  duration?: string;
  hasRecording?: boolean;
  hasReport?: boolean;
}

interface AppointmentContextType {
  appointment: AppointmentDisplay | null;
  setAppointment: (appointment: AppointmentDisplay | null) => void;
}

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);

export const useAppointment = () => {
  const context = useContext(AppointmentContext);
  if (!context) {
    throw new Error("useAppointment must be used within AppointmentProvider");
  }
  return context;
};

export const AppointmentProvider = ({ children }: { children: ReactNode }) => {
  const [appointment, setAppointment] = useState<AppointmentDisplay | null>(null);

  return (
    <AppointmentContext.Provider value={{ appointment, setAppointment }}>
      {children}
    </AppointmentContext.Provider>
  );
}; 