"use client"

import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogIn } from 'lucide-react'

export default function DoctorSignUpPage() {

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Provider Registration</h1>
        <p className="text-gray-600">Create your healthcare provider account</p>
      </div>
      
      <SignUp 
        forceRedirectUrl="/doctor/dashboard"
        appearance={{
          elements: {
            formButtonPrimary: 'bg-emerald-600 hover:bg-emerald-700',
            footerActionLink: 'text-emerald-600 hover:text-emerald-700'
          }
        }}
      />
      
      <div className="text-center space-y-4">
        <div className="text-sm text-gray-500">
          Already have an account?
        </div>
        <Link href="/doctor/sign-in">
          <Button variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50">
            <LogIn className="h-4 w-4 mr-2" />
            Sign In to Portal
          </Button>
        </Link>
      </div>
    </div>
  )
} 