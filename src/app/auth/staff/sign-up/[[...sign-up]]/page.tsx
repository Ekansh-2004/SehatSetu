import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogIn } from 'lucide-react'

export default function StaffSignUpPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Register as Staff</h1>
        <p className="text-gray-600">Create your staff account</p>
      </div>
      
      <SignUp
        forceRedirectUrl="/staff/dashboard"
        fallbackRedirectUrl="/staff/dashboard"
        unsafeMetadata={{ role: 'staff' }}
        appearance={{
          elements: {
            formButtonPrimary: 'bg-purple-600 hover:bg-purple-700',
            footerActionLink: 'text-purple-600 hover:text-purple-700'
          }
        }}
      />
      
      <div className="text-center space-y-4">
        <div className="text-sm text-gray-500">
          Already have an account?
        </div>
        <Link href="/staff/sign-in">
          <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50">
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        </Link>
      </div>
    </div>
  )
}

