// WhatsApp Business API Client - Full Integration
// Using Meta Cloud API for WhatsApp Business with Template Messages

export interface SlotOption {
  date: string;
  startTime: string;
  endTime: string;
}

/**
 * Format a slot for display in WhatsApp message
 */
function formatSlot(slot: SlotOption): string {
  const date = new Date(slot.date);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  // Convert 24h time to 12h format
  const [hours, minutes] = slot.startTime.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const timeStr = `${displayHour}:${minutes} ${ampm}`;
  
  return `${dayName}, ${dateStr} at ${timeStr}`;
}

/**
 * Format phone number for WhatsApp (must include country code, no + prefix)
 * Examples: 
 *   +91 7340990043 → 917340990043
 *   7340990043 → 917340990043 (assumes India if no country code)
 */
function formatPhoneForWhatsApp(phone: string | null | undefined): string {
  if (!phone) {
    throw new Error('Phone number is required');
  }
  
  // Remove all non-digit characters (including +)
  let digits = phone.replace(/[^\d]/g, '');
  
  // If only 10 digits, assume India (+91) - change this default as needed
  if (digits.length === 10) {
    digits = '91' + digits;
  }
  
  return digits;
}

/**
 * Send a WhatsApp Template Message using Meta Cloud API
 */
async function sendWhatsAppTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string,
  parameters: string[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';

  if (!accessToken || !phoneNumberId) {
    console.error('WhatsApp not configured - Missing credentials');
    console.log('📱 MOCK WhatsApp Template - (WhatsApp not configured)');
    console.log(`To: ${to}`);
    console.log(`Template: ${templateName}`);
    console.log(`Parameters:`, parameters);
    return {
      success: false,
      error: 'WhatsApp service not configured. Please add WhatsApp Business API credentials.',
    };
  }

  const formattedPhone = formatPhoneForWhatsApp(to);

  // Build template components with parameters
  const components = parameters.length > 0 ? [
    {
      type: 'body',
      parameters: parameters.map(text => ({ type: 'text', text })),
    },
  ] : [];

  try {
    const response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ WhatsApp API error:', data);
      return {
        success: false,
        error: data.error?.message || 'Failed to send WhatsApp message',
      };
    }

    const messageId = data.messages?.[0]?.id;
    console.log('✅ WhatsApp template message sent successfully:', messageId);
    console.log(`To: ${formattedPhone}`);
    console.log(`Template: ${templateName}`);

    return {
      success: true,
      messageId,
    };
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp message:', error);
    return {
      success: false,
      error: error.message || 'Failed to send WhatsApp message',
    };
  }
}

/**
 * Send slot options to patient via WhatsApp using template: clin_utiliy
 * Template parameters: {{1}} Patient name, {{2}} Doctor name, {{3}} Slot 1, {{4}} Slot 2, {{5}} Slot 3
 */
export async function sendSlotOptionsMessage(
  phone: string,
  patientName: string,
  doctorName: string,
  slots: SlotOption[],
  offerId: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  
  // Format slots for template parameters (template expects exactly 3 slots)
  const slot1 = slots[0] ? formatSlot(slots[0]) : 'N/A';
  const slot2 = slots[1] ? formatSlot(slots[1]) : 'N/A';
  const slot3 = slots[2] ? formatSlot(slots[2]) : 'N/A';

  const parameters = [
    patientName,    // {{1}} Patient name
    doctorName,     // {{2}} Doctor name
    slot1,          // {{3}} Slot option 1
    slot2,          // {{4}} Slot option 2
    slot3,          // {{5}} Slot option 3
  ];

  console.log('Sending slot options with template clin_utiliy:', parameters);

  const result = await sendWhatsAppTemplateMessage(
    phone,
    'clin_utiliy',  // Template name (as provided)
    'en',           // Language code
    parameters
  );
  
  return {
    success: result.success,
    messageSid: result.messageId,
    error: result.error,
  };
}

/**
 * Send confirmation message after patient selects a slot
 * Uses the same booking template since slot is confirmed
 */
export async function sendSlotConfirmationMessage(
  phone: string,
  patientName: string,
  doctorName: string,
  confirmedSlot: SlotOption
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  
  // Format date and time for the template
  const date = new Date(confirmedSlot.date);
  const dateStr = date.toLocaleDateString('en-US', { 
    day: 'numeric',
    month: 'short',
  });
  
  const [hours, minutes] = confirmedSlot.startTime.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const timeStr = `${displayHour}:${minutes} ${ampm}`;

  const parameters = [
    patientName,    // {{1}} Patient name
    doctorName,     // {{2}} Doctor name
    dateStr,        // {{3}} Date
    timeStr,        // {{4}} Time
  ];

  console.log('Sending confirmation with template appointment_book:', parameters);

  const result = await sendWhatsAppTemplateMessage(
    phone,
    'appointment_book',  // Template name for booking confirmation
    'en',
    parameters
  );
  
  return {
    success: result.success,
    messageSid: result.messageId,
    error: result.error,
  };
}

/**
 * Send final booking confirmation after staff completes the booking
 * Uses template: appointment_book
 * Template: Hello {{1}}, Your appointment with Dr. {{2}} is confirmed for {{3}} at {{4}}.
 */
export async function sendBookingConfirmation(
  phone: string,
  patientName: string,
  doctorName: string,
  appointmentDate: string,
  appointmentTime: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  
  const parameters = [
    patientName,      // {{1}} Patient name
    doctorName,       // {{2}} Doctor name
    appointmentDate,  // {{3}} Date
    appointmentTime,  // {{4}} Time
  ];

  console.log('Sending booking confirmation with template appointment_book:', parameters);

  const result = await sendWhatsAppTemplateMessage(
    phone,
    'appointment_book',
    'en',
    parameters
  );
  
  return {
    success: result.success,
    messageSid: result.messageId,
    error: result.error,
  };
}

/**
 * Check if WhatsApp is properly configured
 */
export function isWhatsAppConfigured(): boolean {
  return !!(
    process.env.WHATSAPP_ACCESS_TOKEN && 
    process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

/**
 * Send a generic WhatsApp template message (for testing)
 */
export async function sendGenericWhatsAppMessage(
  phone: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // For testing, we'll use the hello_world template which is pre-approved
  return sendWhatsAppTemplateMessage(phone, 'hello_world', 'en_US', []);
}
