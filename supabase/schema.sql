-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum Types
CREATE TYPE user_role AS ENUM ('super_admin', 'school_admin', 'staff', 'student');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'half_day');
CREATE TYPE exam_type AS ENUM ('unit_test', 'quarterly', 'half_yearly', 'pre_final', 'final');
CREATE TYPE grade_letter AS ENUM ('A+', 'A', 'B', 'C', 'D', 'F');

-- Schools Table (Multi-tenancy root)
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    school_code VARCHAR(50) UNIQUE NOT NULL,
    logo_url TEXT,
    principal_name VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    pincode VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Profiles Table (Extends Supabase Auth)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE, -- NULL for super_admin
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(20),
    role user_role NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Academic Years
CREATE TABLE academic_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- e.g., "2023-2024"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Classes
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    level INTEGER, -- e.g., 10 for Class 10, for sorting/promotion logic
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Sections
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- e.g., 'A', 'B'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (class_id, name)
);

-- Subjects
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (school_id, code)
);

-- Staff Profile (Extended details)
CREATE TABLE staff (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    staff_id VARCHAR(50) NOT NULL,
    designation VARCHAR(100),
    qualification VARCHAR(255),
    experience_years INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (id, staff_id)
);

-- Students Profile (Extended details)
CREATE TABLE students (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    roll_number VARCHAR(50) NOT NULL,
    admission_number VARCHAR(50) NOT NULL,
    gender VARCHAR(20),
    date_of_birth DATE,
    blood_group VARCHAR(10),
    parent_name VARCHAR(255),
    parent_mobile VARCHAR(20),
    parent_email VARCHAR(255),
    address TEXT,
    section_id UUID REFERENCES sections(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Subject-Class Assignment
CREATE TABLE class_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE(class_id, subject_id)
);

-- Staff Assignments (Who teaches what to which section)
CREATE TABLE staff_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    is_class_teacher BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Timetables
CREATE TABLE timetables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    day_of_week VARCHAR(20) NOT NULL, -- Monday, Tuesday, etc.
    period_number INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (section_id, day_of_week, period_number)
);

-- Attendance
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status attendance_status NOT NULL,
    marked_by UUID NOT NULL REFERENCES profiles(id),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (student_id, date)
);

-- Exams
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type exam_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Marks
CREATE TABLE marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(5,2),
    max_marks DECIMAL(5,2) NOT NULL,
    grade grade_letter,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (exam_id, student_id, subject_id)
);

-- Announcements
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'normal',
    target_audience VARCHAR(50) DEFAULT 'all', -- all, staff, students, class_id, section_id
    target_id UUID, -- NULL if all/staff/students, filled if class/section
    publish_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Activity Logs
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;


-- --------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION get_user_role() RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_school_id() RETURNS UUID AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Schools: Super admin can see all, School admin/staff/student can see their own
CREATE POLICY "Super Admins can manage schools" ON schools
    FOR ALL USING (get_user_role() = 'super_admin');
CREATE POLICY "Users can view their own school" ON schools
    FOR SELECT USING (id = get_user_school_id());

-- Profiles
CREATE POLICY "Super Admins can manage all profiles" ON profiles
    FOR ALL USING (get_user_role() = 'super_admin');
CREATE POLICY "School Admins can manage profiles in their school" ON profiles
    FOR ALL USING (get_user_role() = 'school_admin' AND school_id = get_user_school_id());
CREATE POLICY "Users can read profiles in their school" ON profiles
    FOR SELECT USING (school_id = get_user_school_id());
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Generic Policies for School-Scoped Tables (academic_years, classes, subjects, announcements, activity_logs)
-- Applies to: academic_years, classes, subjects, announcements, activity_logs

DO $$
DECLARE
    table_name text;
    tables text[] := ARRAY['academic_years', 'classes', 'subjects', 'announcements', 'activity_logs'];
BEGIN
    FOREACH table_name IN ARRAY tables LOOP
        EXECUTE format('
            CREATE POLICY "Super Admins can manage all in %I" ON %I FOR ALL USING (get_user_role() = ''super_admin'');
            CREATE POLICY "School Admins can manage in %I" ON %I FOR ALL USING (get_user_role() = ''school_admin'' AND school_id = get_user_school_id());
            CREATE POLICY "Staff and Students can read in %I" ON %I FOR SELECT USING (school_id = get_user_school_id());
        ', table_name, table_name, table_name, table_name, table_name, table_name);
    END LOOP;
END $$;


-- Sections (Requires joining with classes for school check)
CREATE POLICY "School Admins can manage sections" ON sections
    FOR ALL USING (
        (get_user_role() = 'school_admin') AND
        (class_id IN (SELECT id FROM classes WHERE school_id = get_user_school_id()))
    );
CREATE POLICY "Users can read sections" ON sections
    FOR SELECT USING (class_id IN (SELECT id FROM classes WHERE school_id = get_user_school_id()));

-- Students
CREATE POLICY "School Admins can manage students" ON students
    FOR ALL USING (
        (get_user_role() = 'school_admin') AND
        (id IN (SELECT id FROM profiles WHERE school_id = get_user_school_id()))
    );
CREATE POLICY "Staff can view students in their school" ON students
    FOR SELECT USING (
        (get_user_role() = 'staff') AND
        (id IN (SELECT id FROM profiles WHERE school_id = get_user_school_id()))
    );
CREATE POLICY "Students can view their own record" ON students
    FOR SELECT USING (id = auth.uid());

-- Staff
CREATE POLICY "School Admins can manage staff" ON staff
    FOR ALL USING (
        (get_user_role() = 'school_admin') AND
        (id IN (SELECT id FROM profiles WHERE school_id = get_user_school_id()))
    );
CREATE POLICY "All users can view staff in their school" ON staff
    FOR SELECT USING (id IN (SELECT id FROM profiles WHERE school_id = get_user_school_id()));


-- Timetables (Joined via Section -> Class -> School)
CREATE POLICY "School Admins can manage timetables" ON timetables
    FOR ALL USING (
        get_user_role() = 'school_admin' AND
        section_id IN (
            SELECT s.id FROM sections s
            JOIN classes c ON s.class_id = c.id
            WHERE c.school_id = get_user_school_id()
        )
    );
CREATE POLICY "Users can view timetables in their school" ON timetables
    FOR SELECT USING (
        section_id IN (
            SELECT s.id FROM sections s
            JOIN classes c ON s.class_id = c.id
            WHERE c.school_id = get_user_school_id()
        )
    );


-- Attendance
CREATE POLICY "School Admins can manage all attendance" ON attendance
    FOR ALL USING (
        get_user_role() = 'school_admin' AND
        section_id IN (
            SELECT s.id FROM sections s
            JOIN classes c ON s.class_id = c.id
            WHERE c.school_id = get_user_school_id()
        )
    );
CREATE POLICY "Staff can manage attendance" ON attendance
    FOR ALL USING (
        get_user_role() = 'staff' AND
        section_id IN (
            SELECT s.id FROM sections s
            JOIN classes c ON s.class_id = c.id
            WHERE c.school_id = get_user_school_id()
        )
    );
CREATE POLICY "Students can view their own attendance" ON attendance
    FOR SELECT USING (student_id = auth.uid());

-- Marks
CREATE POLICY "School Admins can manage all marks" ON marks
    FOR ALL USING (
        get_user_role() = 'school_admin' AND
        student_id IN (SELECT id FROM students WHERE id IN (SELECT id FROM profiles WHERE school_id = get_user_school_id()))
    );
CREATE POLICY "Staff can manage marks" ON marks
    FOR ALL USING (
        get_user_role() = 'staff' AND
        student_id IN (SELECT id FROM students WHERE id IN (SELECT id FROM profiles WHERE school_id = get_user_school_id()))
    );
CREATE POLICY "Students can view their own marks" ON marks
    FOR SELECT USING (student_id = auth.uid());


-- --------------------------------------------------------
-- TRIGGER FOR NEW USER SIGNUP
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- We assume standard signups will need to be enriched via app UI,
  -- but we can initialize a basic profile row.
  -- You can pass role and school_id via raw_user_meta_data during sign up
  INSERT INTO public.profiles (id, email, full_name, role, school_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'student'::user_role),
    NULLIF(new.raw_user_meta_data->>'school_id', '')::uuid
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable Storage buckets (Assuming they exist, if not, create them via Supabase UI or API)
-- Buckets: 'logos', 'documents', 'profiles'
