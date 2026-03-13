import * as z from 'zod';

export const doctorRegistrationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  specialty: z.string().min(2, 'Specialty is required'),
  experience: z.number().min(0, 'Experience must be 0 or greater'),
  rating: z.number().min(0).max(5, 'Rating must be between 0 and 5'),
  consultationFee: z.number().min(0, 'Consultation fee must be 0 or greater'),
  location: z.string().min(1, 'Location is required'),
  bio: z.string().optional(),
  education: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  availability: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    slotDuration: z.number().min(15, 'Slot duration must be at least 15 minutes'),
    breakTimes: z.array(z.object({
      startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
      endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    })).optional(),
  })).optional(),
});

export type DoctorRegistrationData = z.infer<typeof doctorRegistrationSchema>; 