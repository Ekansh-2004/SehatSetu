import { Resend } from 'resend';

let resendClient: Resend | null = null;
function getResend(): Resend {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  resendClient = new Resend(apiKey);
  return resendClient;
}

export interface AppointmentEmailData {
  patientName: string;
  patientEmail: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  meetingRoomUrl: string;
  appointmentId: string;
}

export async function sendAppointmentConfirmationEmail(data: AppointmentEmailData) {
  try {
    const {
      patientName,
      patientEmail,
      doctorName,
      appointmentDate,
      appointmentTime,
      meetingRoomUrl,
      appointmentId,
    } = data;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">Appointment Confirmed</h1>
            <p style="color: #666; font-size: 16px;">Your consultation is scheduled and ready</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #1e293b; margin-bottom: 15px; font-size: 18px;">Appointment Details</h2>
            <div style="display: grid; gap: 10px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="font-weight: 600; color: #475569;">Patient:</span>
                <span style="color: #64748b;">${patientName}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="font-weight: 600; color: #475569;">Doctor:</span>
                <span style="color: #64748b;">${doctorName}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="font-weight: 600; color: #475569;">Date:</span>
                <span style="color: #64748b;">${appointmentDate}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="font-weight: 600; color: #475569;">Time:</span>
                <span style="color: #64748b;">${appointmentTime}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span style="font-weight: 600; color: #475569;">Appointment ID:</span>
                <span style="color: #64748b;">${appointmentId}</span>
              </div>
            </div>
          </div>

          <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 30px;">
            <h3 style="color: #065f46; margin-bottom: 10px; font-size: 16px;">🎥 Join Your Video Consultation</h3>
            <p style="color: #047857; margin-bottom: 15px; line-height: 1.5;">
              At your appointment time, click the link below to join the video consultation with your doctor:
            </p>
            <div style="text-align: center;">
              <a href="${meetingRoomUrl}" 
                 style="display: inline-block; background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0;">
                Join Video Consultation
              </a>
            </div>
            <p style="color: #047857; font-size: 14px; margin-top: 15px;">
              💡 <strong>Pro tip:</strong> Test your camera and microphone before the appointment using the pre-join screen.
            </p>
          </div>

          <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <h4 style="color: #92400e; margin-bottom: 8px; font-size: 14px;">📋 Before Your Appointment:</h4>
            <ul style="color: #b45309; font-size: 14px; margin: 0; padding-left: 20px;">
              <li>Ensure you have a stable internet connection</li>
              <li>Find a quiet, well-lit location</li>
              <li>Have your medical history and current medications ready</li>
              <li>Test your camera and microphone beforehand</li>
            </ul>
          </div>

          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">
              If you need to reschedule or have any questions, please contact our support team.
            </p>
            <p style="color: #64748b; font-size: 12px; margin: 5px 0 0 0;">
              This appointment was booked through our secure online platform.
            </p>
          </div>
        </div>
      </div>
    `;

    const resend = getResend();
    const { data: emailResult, error } = await resend.emails.send({
      from: 'Clinic <noreply@clinic.com>',
      to: [patientEmail],
      subject: `Appointment Confirmed - ${appointmentDate} at ${appointmentTime}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log('Appointment confirmation email sent:', emailResult);
    return { success: true, emailId: emailResult?.id };
  } catch (error) {
    console.error('Error sending appointment confirmation email:', error);
    throw error;
  }
}

export async function sendAppointmentReminderEmail(data: AppointmentEmailData) {
  try {
    const {
      patientName,
      patientEmail,
      doctorName,
      appointmentDate,
      appointmentTime,
      meetingRoomUrl,
    } = data;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">Appointment Reminder</h1>
            <p style="color: #666; font-size: 16px;">Your consultation is coming up soon</p>
          </div>
          
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 30px;">
            <h2 style="color: #92400e; margin-bottom: 15px; font-size: 18px;">⏰ Reminder</h2>
            <p style="color: #b45309; font-size: 16px; margin-bottom: 10px;">
              Hello ${patientName}, your appointment with  ${doctorName} is scheduled for:
            </p>
            <p style="color: #92400e; font-weight: 600; font-size: 18px;">
              ${appointmentDate} at ${appointmentTime}
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${meetingRoomUrl}" 
               style="display: inline-block; background-color: #10b981; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Join Video Consultation
            </a>
          </div>

          <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px;">
            <p style="color: #0c4a6e; font-size: 14px; margin: 0;">
              📱 Click the link above at your appointment time to join the video consultation.
            </p>
          </div>
        </div>
      </div>
    `;

    const resend = getResend();
    const { data: emailResult, error } = await resend.emails.send({
      from: 'Clinic <noreply@clinic.com>',
      to: [patientEmail],
      subject: `Reminder: Appointment Tomorrow - ${appointmentDate} at ${appointmentTime}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send reminder email:', error);
      throw new Error(`Failed to send reminder email: ${error.message}`);
    }

    console.log('Appointment reminder email sent:', emailResult);
    return { success: true, emailId: emailResult?.id };
  } catch (error) {
    console.error('Error sending appointment reminder email:', error);
    throw error;
  }
}