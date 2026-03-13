import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'

export default function StaffSignInPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Staff Portal</h1>
        <p className="text-gray-600">Access staff management dashboard</p>
      </div>
      
      <SignIn
        fallbackRedirectUrl="/staff/dashboard"
        appearance={{
          elements: {
            formButtonPrimary: 'bg-purple-600 hover:bg-purple-700',
            footerActionLink: 'text-purple-600 hover:text-purple-700'
          }
        }}
      />
      
      <div className="text-center space-y-4">
        <div className="text-sm text-gray-500">
          Don&apos;t have an account yet?
        </div>
        <Link href="/staff/sign-up">
          <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50">
            <UserPlus className="h-4 w-4 mr-2" />
            Register as Staff
          </Button>
        </Link>
      </div>
    </div>
  )
}

