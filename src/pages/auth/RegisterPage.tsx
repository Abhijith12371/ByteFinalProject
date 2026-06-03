import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, ChevronRight, Building2, User, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Schemas ─────────────────────────────────────────────────────────────────
const step1Schema = z.object({
  full_name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Min 8 characters'),
  mobile_number: z.string().min(10, 'Valid mobile required'),
})

const step2Schema = z.object({
  school_name: z.string().min(2, 'School name required'),
  principal_name: z.string().min(2, 'Principal name required'),
  address: z.string().min(5, 'Address required'),
  city: z.string().min(2, 'City required'),
  state: z.string().min(2, 'State required'),
  country: z.string().optional(),
  pincode: z.string().min(4, 'Pincode required'),
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>

const steps = [
  { id: 1, label: 'Account', icon: <User size={16} /> },
  { id: 2, label: 'School', icon: <Building2 size={16} /> },
  { id: 3, label: 'Setup', icon: <BookOpen size={16} /> },
]

function generateSchoolCode(name: string) {
  return name.replace(/\s+/g, '').toUpperCase().slice(0, 4) + Math.floor(1000 + Math.random() * 9000)
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
const StepIndicator: React.FC<{ current: number }> = ({ current }) => (
  <div className="flex items-center gap-2 mb-8">
    {steps.map((step, i) => (
      <React.Fragment key={step.id}>
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300',
            current > step.id ? 'bg-success text-white' :
            current === step.id ? 'bg-primary text-white' :
            'bg-muted text-muted-foreground'
          )}>
            {current > step.id ? <Check size={14} /> : step.icon}
          </div>
          <span className={cn('text-sm font-medium hidden sm:block', current === step.id ? 'text-foreground' : 'text-muted-foreground')}>
            {step.label}
          </span>
        </div>
        {i < steps.length - 1 && (
          <div className={cn('flex-1 h-px transition-colors duration-300', current > step.id ? 'bg-success' : 'bg-border')} />
        )}
      </React.Fragment>
    ))}
  </div>
)

// ─── Step 1: Account ──────────────────────────────────────────────────────────
const Step1: React.FC<{ onNext: (d: Step1Data) => void }> = ({ onNext }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
  })
  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1.5">
          <Label>Full Name</Label>
          <Input placeholder="John Doe" {...register('full_name')} />
          {errors.full_name && <p className="text-xs text-danger">{errors.full_name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Email Address</Label>
          <Input type="email" placeholder="admin@school.com" {...register('email')} />
          {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Password</Label>
          <Input type="password" placeholder="Min 8 characters" {...register('password')} />
          {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Mobile Number</Label>
          <Input type="tel" placeholder="9876543210" {...register('mobile_number')} />
          {errors.mobile_number && <p className="text-xs text-danger">{errors.mobile_number.message}</p>}
        </div>
      </div>
      <Button type="submit" className="w-full h-10" isLoading={isSubmitting}>
        Continue <ChevronRight size={16} />
      </Button>
    </form>
  )
}

// ─── Step 2: School Details ───────────────────────────────────────────────────
const Step2: React.FC<{ onNext: (d: any) => void; onBack: () => void }> = ({ onNext, onBack }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { country: 'India' },
  })
  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>School Name</Label>
          <Input placeholder="Delhi Public School" {...register('school_name')} />
          {errors.school_name && <p className="text-xs text-danger">{errors.school_name.message}</p>}
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Principal Name</Label>
          <Input placeholder="Dr. Rajesh Kumar" {...register('principal_name')} />
          {errors.principal_name && <p className="text-xs text-danger">{errors.principal_name.message}</p>}
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Address</Label>
          <Input placeholder="123, Main Street" {...register('address')} />
          {errors.address && <p className="text-xs text-danger">{errors.address.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>City</Label>
          <Input placeholder="New Delhi" {...register('city')} />
          {errors.city && <p className="text-xs text-danger">{errors.city.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>State</Label>
          <Input placeholder="Delhi" {...register('state')} />
          {errors.state && <p className="text-xs text-danger">{errors.state.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Country</Label>
          <Input placeholder="India" {...register('country')} />
        </div>
        <div className="space-y-1.5">
          <Label>Pincode</Label>
          <Input placeholder="110001" {...register('pincode')} />
          {errors.pincode && <p className="text-xs text-danger">{errors.pincode.message}</p>}
        </div>
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1 h-10" onClick={onBack}>Back</Button>
        <Button type="submit" className="flex-1 h-10" isLoading={isSubmitting}>
          Continue <ChevronRight size={16} />
        </Button>
      </div>
    </form>
  )
}

// ─── Step 3: Review & Submit ──────────────────────────────────────────────────
const Step3: React.FC<{ step1: Step1Data; step2: Step2Data; onBack: () => void }> = ({ step1, step2, onBack }) => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setIsLoading(true)
    setError('')
    try {
      // 1. Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: step1.email,
        password: step1.password,
        options: {
          data: {
            full_name: step1.full_name,
            role: 'school_admin',
          },
        },
      })
      if (authError) {
        if (authError.status === 429) {
          throw new Error('Too many registration attempts. Please wait a few minutes and try again, or check your Supabase rate limit settings.')
        }
        throw authError
      }
      if (!authData.user) throw new Error('User creation failed')

      // 2. Create school record
      const schoolCode = generateSchoolCode(step2.school_name)
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .insert({
          name: step2.school_name,
          school_code: schoolCode,
          principal_name: step2.principal_name,
          address: step2.address,
          city: step2.city,
          state: step2.state,
          country: step2.country,
          pincode: step2.pincode,
        } as any)
        .select()
        .single() as any
      if (schoolError) throw schoolError

      // 3. Update profile with school_id and mobile
      await supabase
        .from('profiles')
        .update({
          school_id: schoolData.id,
          mobile_number: step1.mobile_number,
          role: 'school_admin',
        } as never)
        .eq('id', authData.user.id as never)

      navigate('/admin')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/40 divide-y divide-border">
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Account</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Name</span><span className="text-foreground font-medium">{step1.full_name}</span>
            <span className="text-muted-foreground">Email</span><span className="text-foreground font-medium">{step1.email}</span>
            <span className="text-muted-foreground">Mobile</span><span className="text-foreground font-medium">{step1.mobile_number}</span>
          </div>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">School</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">School</span><span className="text-foreground font-medium">{step2.school_name}</span>
            <span className="text-muted-foreground">Principal</span><span className="text-foreground font-medium">{step2.principal_name}</span>
            <span className="text-muted-foreground">City</span><span className="text-foreground font-medium">{step2.city}, {step2.state}</span>
          </div>
        </div>
      </div>
      {error && (
        <div className="rounded-md bg-danger/10 border border-danger/20 px-3 py-2">
          <p className="text-xs text-danger">{error}</p>
        </div>
      )}
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1 h-10" onClick={onBack}>Back</Button>
        <Button className="flex-1 h-10" isLoading={isLoading} onClick={handleSubmit}>
          Create School 🎉
        </Button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const RegisterPage: React.FC = () => {
  const [step, setStep] = useState(1)
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null)

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <span className="text-lg font-bold text-foreground">Byte</span>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-foreground">Create your school</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Set up your school workspace in minutes</p>
          </div>

          <StepIndicator current={step} />

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 && (
                <Step1 onNext={(d) => { setStep1Data(d); setStep(2) }} />
              )}
              {step === 2 && (
                <Step2 onNext={(d) => { setStep2Data(d); setStep(3) }} onBack={() => setStep(1)} />
              )}
              {step === 3 && step1Data && step2Data && (
                <Step3 step1={step1Data} step2={step2Data} onBack={() => setStep(2)} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
