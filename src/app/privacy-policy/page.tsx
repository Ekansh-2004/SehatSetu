import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header/Navigation */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link href="/home" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#2192B4' }}>Privacy Policy</h1>
          <p className="text-lg text-gray-600">Clinix by LivConnect</p>
          <p className="text-sm text-gray-500 mt-2">
            Effective: November 22, 2025 | Last Updated: November 22, 2025
          </p>
      </div>

        {/* Introduction */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#2192B4' }}>Introduction</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Clinix by LivConnect (&quot;Clinix,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting patient and provider privacy. This Privacy Policy explains how Clinix collects, uses, discloses, and safeguards information when healthcare units and organizations (&quot;Providers&quot;) use our OPD (Outpatient Department) management services (&quot;the Services&quot;).
          </p>
          <p className="text-gray-700 leading-relaxed">
            <strong>By using the Services, you agree to the terms described in this Privacy Policy.</strong>
          </p>
        </section>

        {/* Definitions */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#2192B4' }}>1. Definitions</h2>
          <dl className="space-y-4">
            <div>
              <dt className="font-semibold text-gray-900">Clinix</dt>
              <dd className="text-gray-700 ml-4">The OPD management solution offered by LivConnect.</dd>
              </div>
            <div>
              <dt className="font-semibold text-gray-900">Provider</dt>
              <dd className="text-gray-700 ml-4">Hospitals, clinics, and healthcare organizations that use Clinix to manage outpatient workflows.</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Patient</dt>
              <dd className="text-gray-700 ml-4">An individual who fills out the patient form and interacts with the Provider using Clinix Services.</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Personal Information</dt>
              <dd className="text-gray-700 ml-4">Any information provided by the patient during form filling, including name, contact information, health-related information, and appointment details.</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">SMS Interaction</dt>
              <dd className="text-gray-700 ml-4">Communication initiated through authorized SMS channels for appointment booking, reminders, updates, or cancellations.</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Services</dt>
              <dd className="text-gray-700 ml-4">OPD management tools, patient appointment workflows, and SMS communication functionalities provided by Clinix.</dd>
            </div>
          </dl>
        </section>

        {/* Information We Collect */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#2192B4' }}>2. Information We Collect</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Clinix collects information solely for enabling OPD-related interactions between the Provider and the Patient.
          </p>
          
          <h3 className="text-xl font-semibold mb-3 mt-6" style={{ color: '#2192B4' }}>2.1 Patient Information</h3>
          <p className="text-gray-700 mb-2">Provided directly by the patient during form filling:</p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
            <li>Name</li>
            <li>Phone number</li>
            <li>Gender</li>
            <li>Age</li>
            <li>Health concern</li>
            <li>Preferred appointment date/time</li>
          </ul>
          <p className="text-gray-700 mt-3 italic">
            Only patients who explicitly provide their information and opt-in to receive SMS communication will be contacted via SMS.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6" style={{ color: '#2192B4' }}>2.2 Appointment & Interaction Data</h3>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
            <li>Appointment booking and cancellation details</li>
            <li>SMS delivery status</li>
            <li>Interaction timestamps</li>
            <li>Provider-selected configurations</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6" style={{ color: '#2192B4' }}>2.3 Technical Information (Minimal)</h3>
          <p className="text-gray-700 mb-2">To ensure reliable SMS and appointment functionality:</p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
            <li>Device type (if applicable)</li>
            <li>IP-based metadata (non-identifiable)</li>
          </ul>

          <div className="mt-6 p-4 bg-gray-100 border-l-4 border-gray-900">
            <p className="text-gray-900 font-semibold">
              Clinix does not collect or store medical records, treatment history, or any clinical data beyond what is essential for booking appointments.
            </p>
          </div>
        </section>

        {/* How We Use Information */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#2192B4' }}>3. How We Use Information</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
          Clinix uses collected information only for the following purposes:
        </p>

          <h3 className="text-xl font-semibold mb-3" style={{ color: '#2192B4' }}>3.1 To Facilitate Appointments</h3>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4 mb-4">
            <li>Booking, rescheduling, and cancellation</li>
            <li>Sending appointment confirmations and reminders</li>
            <li>Notifying patients of changes or provider updates via SMS</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3" style={{ color: '#2192B4' }}>3.2 To Communicate With Patients (SMS only)</h3>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4 mb-4">
            <li>Only patients who opt-in will receive SMS communication</li>
            <li>No promotional messages are sent without explicit consent</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3" style={{ color: '#2192B4' }}>3.3 To Enable Provider Operations</h3>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4 mb-4">
            <li>Allowing the Provider to view, manage, and act on patient appointment requests</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3" style={{ color: '#2192B4' }}>3.4 To Maintain System Reliability</h3>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4 mb-4">
            <li>Monitoring SMS delivery</li>
            <li>Preventing spam and misuse</li>
            <li>Ensuring service uptime and accuracy</li>
          </ul>

          <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-500">
            <p className="text-gray-900 font-semibold">
              ⚠️ Clinix does not use patient data for analytics, marketing, AI training, or profiling.
            </p>
          </div>
        </section>

        {/* Data Ownership & Sharing */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#2192B4' }}>4. Data Ownership & Sharing</h2>
          
          <h3 className="text-xl font-semibold mb-3" style={{ color: '#2192B4' }}>4.1 Data Ownership</h3>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4 mb-4">
            <li>All patient data belongs exclusively to the Provider</li>
            <li>Clinix acts only as a technical facilitator</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3" style={{ color: '#2192B4' }}>4.2 Data Sharing</h3>
          <p className="text-gray-700 mb-4">
            Clinix shares patient-provided information <strong>only</strong> with the Provider the patient is interacting with.
          </p>
          <p className="text-gray-700 mb-2 font-semibold">No patient information is ever shared with:</p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4 mb-4">
            <li>Third-party advertisers</li>
            <li>Data brokers</li>
            <li>External analytics companies</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3" style={{ color: '#2192B4' }}>4.3 Third-Party Service Providers</h3>
          <p className="text-gray-700 mb-2">
            Clinix uses trusted SMS gateway partners solely to deliver appointment-related messages.
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
            <li>Partners receive only phone number and message content for SMS delivery</li>
            <li>No health-related or sensitive personal information is shared</li>
            <li>Clinix does not store patient data beyond what is needed for SMS dispatch</li>
          </ul>
        </section>

        {/* Data Storage & Retention */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#2192B4' }}>5. Data Storage & Retention</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Clinix follows a <strong>minimal data retention model</strong>:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>Patient data collected through forms is immediately forwarded to the Provider</li>
            <li>Clinix does not permanently store or retain patient records</li>
            <li>Temporary logs required for SMS delivery or system reliability are retained only for troubleshooting and compliance requirements, after which they are securely deleted</li>
            <li>Providers may maintain and store patient data according to their own internal policies and regulations</li>
          </ul>
        </section>

        {/* Security of Information */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#2192B4' }}>6. Security of Information</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
          We implement reasonable administrative and technical safeguards:
        </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4 mb-4">
            <li>Encrypted data transfer</li>
            <li>Controlled access to systems</li>
            <li>Secure SMS gateway integrations</li>
            <li>Regular audits and security monitoring</li>
          </ul>
          <p className="text-gray-700 leading-relaxed">
            Since Providers own all data, they are responsible for maintaining the security and confidentiality of patient information within their systems.
          </p>
      </section>

        {/* Patient Rights */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#2192B4' }}>7. Patient Rights</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Since Clinix does not retain patient data, all rights and requests—such as data correction, deletion, or access—must be directed to the <strong>Provider</strong> who collected the information.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Clinix will assist Providers in fulfilling lawful rights requests where applicable.
          </p>
      </section>

        {/* Changes to This Privacy Policy */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#2192B4' }}>8. Changes to This Privacy Policy</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>We may update this Privacy Policy from time to time.</li>
            <li>Any significant changes will be communicated via updated documentation on our official channels.</li>
            <li>Continued use of the Services after changes are posted indicates acceptance of the updated policy.</li>
          </ul>
        </section>

        {/* Contact Us */}
        <section className="mb-12 p-6 bg-gray-50 border border-gray-200">
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#2192B4' }}>9. Contact Us</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            For any questions or concerns about this Privacy Policy or our privacy practices:
          </p>
          <div className="ml-4">
            <p className="text-gray-900 font-semibold mb-2">Clinix by LivConnect</p>
            <p className="text-gray-700">
              Email: <a href="mailto:admin@sanvro.com" className="text-blue-600 hover:underline">admin@sanvro.com</a>
            </p>
            <p className="text-gray-700 mt-3">
              We are committed to addressing your privacy concerns promptly and transparently.
            </p>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-8 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-gray-600">
              © 2025 Clinix by LivConnect. All rights reserved.
            </p>
        </div>
      </footer>
    </div>
  );
}
