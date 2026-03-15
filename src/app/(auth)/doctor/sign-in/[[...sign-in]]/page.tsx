import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'
import { Logo } from '@/components/ui/logo'

export default function DoctorSignInPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6 p-4">
      <div className="text-center space-y-2 w-full">
        <div className="mb-4">
          <div className="inline-block">
            <Logo size="lg" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Provider Portal</h1>
        <p className="text-gray-600">Access your practice management dashboard</p>
      </div>
      
      <SignIn
        forceRedirectUrl="/doctor/post-login"
        appearance={{
          elements: {
            formButtonPrimary: 'bg-emerald-600 hover:bg-emerald-700',
            footerActionLink: 'text-emerald-600 hover:text-emerald-700'
          }
        }}
      />
      
      <div className="text-center space-y-4">
        <div className="text-sm text-gray-500">
          Don&apos;t have an account yet?
        </div>
        <Link href="/doctor/sign-up">
          <Button variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50">
            <UserPlus className="h-4 w-4 mr-2" />
            Register as Provider
          </Button>
        </Link>
      </div>
    </div>
  )
} 