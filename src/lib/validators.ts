import { z } from 'zod';

// Login Validation Schema
export const loginSchema = z.object({
  operatorId: z
    .string()
    .min(4, 'Operator ID must be at least 4 digits / PIN / characters')
    .max(10, 'Operator ID too long'),
  password: z
    .string()
    .min(4, 'PIN/Password must be at least 4 digits'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// Waste Collection Record Submission Schema - Updated to align with public.collection_records
export const collectionSchema = z.object({
  project_id: z
    .string()
    .uuid('Please select a project'),
  waste_type: z.enum(['municipal_solid', 'organic', 'plastic', 'construction', 'mixed'], {
    message: 'Please select a waste category',
  }),
  quantity: z
    .number({ message: 'Quantity must be a number' })
    .positive('Quantity must be greater than 0')
    .max(9999.99, 'Quantity exceeds maximum allowable (9999.99)'),
  unit: z.enum(['kg', 'ton'], {
    message: 'Please select a valid unit (kg or ton)',
  }),
  notes: z
    .string()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
  evidence: z
    .array(z.string())
    .min(1, 'At least one photo evidence is required'),
  gps_latitude: z
    .number({ message: 'GPS Latitude is required' })
    .min(-90)
    .max(90),
  gps_longitude: z
    .number({ message: 'GPS Longitude is required' })
    .min(-180)
    .max(180),
  gps_accuracy: z
    .number()
    .min(0, 'GPS accuracy must be positive'),
  collected_at: z
    .string()
    .datetime({ message: 'Collection timestamp must be a valid ISO datetime' }),
});

export type CollectionFormValues = z.infer<typeof collectionSchema>;
