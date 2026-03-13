// Common utility types

interface User {
  id: string
  email: string
  name: string
  role: 'patient' | 'doctor' | 'admin'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Common utility types
interface BreadcrumbItemType {
  name: string;
  href: string;
  isLast: boolean;
}

interface QuestionCategory {
  id: string;
  category: string;
  questions: string[];
}

interface MuscleSearchResult {
  muscle_name: string;
  description: string;
  s3_url: string;
  score: number;
}

interface QdrantSearchResponse {
  success: boolean;
  results: MuscleSearchResult[];
  error?: string;
}

interface ComprehendMedicalEntity {
  Id: number;
  Text: string;
  Category: string;
  Type: string;
  Score: number;
  BeginOffset: number;
  EndOffset: number;
  Traits?: Array<{ Name: string; Score: number }>;
  Attributes?: Array<unknown>;
}

interface QdrantResult {
  score: number;
  muscle_name?: string;
  'Image URL'?: string;
  presignedUrl?: string;
  imageData?: string;
} 

