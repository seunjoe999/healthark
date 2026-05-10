export type StaffRole = 'care_staff' | 'senior_carer' | 'home_manager' | 'group_admin' | 'auditor'
export type SUStatus = 'live' | 'pre_admission' | 'archive' | 'on_hold' | 'hospital'
export type EmergencyRating = 'low' | 'medium' | 'high'

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: StaffRole
  homeId: string | null
  organisationId: string
  photoUrl: string | null
}

export interface Home {
  id: string
  name: string
  address1: string
  address2?: string
  postcode: string
  phone?: string
  managerName?: string
  suCount?: number
  staffCount?: number
}

export interface ServiceUser {
  id: string
  homeId: string
  firstName: string
  lastName: string
  preferredName?: string
  dateOfBirth: string
  gender?: string
  pronouns?: string
  photoUrl?: string
  status: SUStatus
  emergencyRating: EmergencyRating
  nhsNumber?: string
  niNumber?: string
  dnar?: boolean
  dnarFormUrl?: string
  nilByMouth: boolean
  minFluidMl: number
  needToKnow?: string
  myInstructions?: string
  admissionDate?: string
  localAuthority?: string
  religion?: string
  ethnicity?: string
  maritalStatus?: string
  commsPrefs?: string
  lifeHistory?: string
  hobbies?: string
  dailyRoutine?: string
  heightCm?: number
  weightKg?: number
  bmi?: number
  medicalHistory?: string
  medAllergies?: string
  requiresOxygen: boolean
  hasCatheter: boolean
  hasPeg: boolean
  foodAllergies?: string
  specialDiet?: string
  fluidConsistency?: string
  dietInstructions?: string
  address1?: string
  postcode?: string
  phone?: string
  createdAt: string
}

export interface SUContact {
  id: string
  suId: string
  fullName: string
  relationship?: string
  contactTag?: 'professional' | 'family' | 'emergency'
  phonePrimary?: string
  phoneSecondary?: string
  email?: string
  isPrimary: boolean
  notes?: string
  displayOrder: number
}

export interface BusinessAlert {
  id: string
  homeId: string
  alertType: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
  suId?: string
  suName?: string
  isResolved: boolean
  createdAt: string
}

export interface Staff {
  id: string
  firstName: string
  lastName: string
  email: string
  role: StaffRole
  status: string
  homeId?: string
  photoUrl?: string
  startDate?: string
  phone?: string
}
