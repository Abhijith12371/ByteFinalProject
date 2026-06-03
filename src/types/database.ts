export type UserRole = 'super_admin' | 'school_admin' | 'staff' | 'student'

export interface Profile {
  id: string
  school_id: string | null
  email: string
  full_name: string
  mobile_number: string | null
  role: UserRole
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface School {
  id: string
  name: string
  school_code: string
  logo_url: string | null
  principal_name: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  pincode: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AcademicYear {
  id: string
  school_id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
  created_at: string
}

export interface Class {
  id: string
  school_id: string
  academic_year_id: string
  name: string
  level: number | null
  created_at: string
}

export interface Section {
  id: string
  class_id: string
  name: string
  created_at: string
}

export interface Subject {
  id: string
  school_id: string
  name: string
  code: string | null
  created_at: string
}

export interface Staff {
  id: string
  staff_id: string
  designation: string | null
  qualification: string | null
  experience_years: number | null
  created_at: string
  profile?: Profile
}

export interface Student {
  id: string
  roll_number: string
  admission_number: string
  gender: string | null
  date_of_birth: string | null
  blood_group: string | null
  parent_name: string | null
  parent_mobile: string | null
  parent_email: string | null
  address: string | null
  section_id: string | null
  created_at: string
  profile?: Profile
  section?: Section & { class?: Class }
}

export interface Timetable {
  id: string
  section_id: string
  day_of_week: string
  period_number: number
  start_time: string
  end_time: string
  subject_id: string
  staff_id: string
  created_at: string
  subject?: Subject
  staff?: Staff & { profile?: Profile }
}

export interface Attendance {
  id: string
  student_id: string
  section_id: string
  date: string
  status: 'present' | 'absent' | 'late' | 'half_day'
  marked_by: string
  remarks: string | null
  created_at: string
}

export interface Announcement {
  id: string
  school_id: string
  title: string
  description: string | null
  priority: string
  target_audience: string
  target_id: string | null
  publish_date: string
  expiry_date: string | null
  created_by: string
  created_at: string
}

export interface ActivityLog {
  id: string
  school_id: string
  user_id: string
  action: string
  entity: string
  entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  profile?: Profile
}

export interface Mark {
  id: string
  exam_id: string
  student_id: string
  subject_id: string
  marks_obtained: number | null
  max_marks: number
  grade: string | null
  remarks: string | null
  created_at: string
}

export interface Exam {
  id: string
  academic_year_id: string
  name: string
  type: 'unit_test' | 'quarterly' | 'half_yearly' | 'pre_final' | 'final'
  start_date: string
  end_date: string
  created_at: string
}

// Placeholder Database type for Supabase client typing
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      schools: { Row: School; Insert: Partial<School>; Update: Partial<School> }
      academic_years: { Row: AcademicYear; Insert: Partial<AcademicYear>; Update: Partial<AcademicYear> }
      classes: { Row: Class; Insert: Partial<Class>; Update: Partial<Class> }
      sections: { Row: Section; Insert: Partial<Section>; Update: Partial<Section> }
      subjects: { Row: Subject; Insert: Partial<Subject>; Update: Partial<Subject> }
      staff: { Row: Staff; Insert: Partial<Staff>; Update: Partial<Staff> }
      students: { Row: Student; Insert: Partial<Student>; Update: Partial<Student> }
      timetables: { Row: Timetable; Insert: Partial<Timetable>; Update: Partial<Timetable> }
      attendance: { Row: Attendance; Insert: Partial<Attendance>; Update: Partial<Attendance> }
      announcements: { Row: Announcement; Insert: Partial<Announcement>; Update: Partial<Announcement> }
      activity_logs: { Row: ActivityLog; Insert: Partial<ActivityLog>; Update: Partial<ActivityLog> }
      marks: { Row: Mark; Insert: Partial<Mark>; Update: Partial<Mark> }
      exams: { Row: Exam; Insert: Partial<Exam>; Update: Partial<Exam> }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
