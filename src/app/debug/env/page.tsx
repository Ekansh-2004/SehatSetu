"use client"

export default function DebugEnv() {
  const checkEnvVar = (name: string, value: string | undefined) => {
    return {
      name,
      exists: !!value,
      value: value ? `${value.substring(0, 10)}...` : 'Not set',
      length: value?.length || 0
    }
  }

  const envVars = [
    checkEnvVar('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    checkEnvVar('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
    checkEnvVar('NEXT_PUBLIC_APP_URL', process.env.NEXT_PUBLIC_APP_URL),
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Environment Variables Debug</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Client-side Environment Variables</h2>
          <div className="space-y-4">
            {envVars.map((env) => (
              <div key={env.name} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{env.name}</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    env.exists ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {env.exists ? 'Set' : 'Missing'}
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Value: {env.value} (Length: {env.length})
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">API Test</h2>
          <button 
            onClick={async () => {
              try {
                const response = await fetch('/api/test')
                const data = await response.json()
                alert(`API Test Success: ${JSON.stringify(data)}`)
              } catch (error) {
                alert(`API Test Failed: ${error}`)
              }
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Test API Connection
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-yellow-800 mb-2">Note:</h3>
          <p className="text-yellow-700 text-sm">
            This page only shows client-side environment variables (those starting with NEXT_PUBLIC_). 
            Server-side variables like STRIPE_SECRET_KEY are not visible here for security reasons.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-blue-800 mb-2">Setup Instructions:</h3>
          <ol className="text-blue-700 text-sm space-y-1">
            <li>1. Create a .env.local file in your project root</li>
            <li>2. Add your Stripe keys from the Stripe dashboard</li>
            <li>3. Add your Clerk keys (already configured)</li>
            <li>4. Restart your development server</li>
          </ol>
        </div>
      </div>
    </div>
  )
} 