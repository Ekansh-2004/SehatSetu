import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface MedicalReportData {
  patientName: string;
  date: string;
  time: string;
  duration?: string;
  sessionId: string;
  summary: string;
  messages: Array<{
    speaker: string;
    text: string;
    timestamp: number;
  }>;
  doctor?: {
    name: string;
    specialty: string;
    email: string;
    phone: string;
    license?: string;
    experience?: number;
  };
}

interface AppointmentConfirmationData {
  appointmentId: string;
  doctorName: string;
  date: string;
  time: string;
  endTime: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  amount: number;
  sessionId: string;
  meetingLink?: string;
}

// Helper function to create clinic logo as base64 data for PDF
const createClinicLogoData = (): string => {
  // Create a canvas to draw the clinic logo (heart icon with "SehatSetu" text)
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  canvas.width = 200;
  canvas.height = 60;
  
  // Clear canvas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw heart icon circle background
  const centerX = 30;
  const centerY = 30;
  const radius = 20;
  
  ctx.fillStyle = '#2563eb'; // blue-600
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fill();
  
  // Draw heart shape (simplified)
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('♥', centerX, centerY + 7);
  
  // Draw "SehatSetu" text
  ctx.fillStyle = '#2563eb';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('SehatSetu', 65, 38);
  
  return canvas.toDataURL('image/png');
};

export async function generateAppointmentConfirmationPDF(data: AppointmentConfirmationData): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 6;
  let yPosition = margin;

  // Add clinic logo at the top
  try {
    const logoData = createClinicLogoData();
    if (logoData) {
      pdf.addImage(logoData, 'PNG', margin, yPosition, 50, 15);
      yPosition += 25;
    }
  } catch (error) {
    console.warn('Failed to add logo to PDF:', error);
    // Continue without logo
  }

  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Appointment Confirmation', margin, yPosition);
  yPosition += lineHeight * 2;

  // Add a line separator
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += lineHeight * 2;

  // Appointment Details Section
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Appointment Details', margin, yPosition);
  yPosition += lineHeight * 1.5;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  
  // Appointment ID
  pdf.setFont('helvetica', 'bold');
  pdf.text('Appointment ID:', margin, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.appointmentId, margin + 40, yPosition);
  yPosition += lineHeight;

  // Doctor Name
  pdf.setFont('helvetica', 'bold');
  pdf.text('Healthcare Provider:', margin, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.doctorName, margin + 40, yPosition);
  yPosition += lineHeight;

  // Date
  pdf.setFont('helvetica', 'bold');
  pdf.text('Date:', margin, yPosition);
  pdf.setFont('helvetica', 'normal');
  const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  pdf.text(formattedDate, margin + 40, yPosition);
  yPosition += lineHeight;

  // Time
  pdf.setFont('helvetica', 'bold');
  pdf.text('Time:', margin, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${data.time} - ${data.endTime} (30 minutes)`, margin + 40, yPosition);
  yPosition += lineHeight;

  // Meeting Link
  if (data.meetingLink) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Meeting Link:', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 255); // Blue color for link
    pdf.text(data.meetingLink, margin + 40, yPosition);
    pdf.setTextColor(0, 0, 0); // Reset to black
    yPosition += lineHeight;
  }
  
  yPosition += lineHeight;

  // Patient Information Section
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Patient Information', margin, yPosition);
  yPosition += lineHeight * 1.5;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');

  // Patient Name
  pdf.setFont('helvetica', 'bold');
  pdf.text('Name:', margin, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.patientName, margin + 40, yPosition);
  yPosition += lineHeight;

  // Email
  pdf.setFont('helvetica', 'bold');
  pdf.text('Email:', margin, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.patientEmail, margin + 40, yPosition);
  yPosition += lineHeight;

  // Phone
  pdf.setFont('helvetica', 'bold');
  pdf.text('Phone:', margin, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.patientPhone, margin + 40, yPosition);
  yPosition += lineHeight * 2;

  // Payment Information Section
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Payment Information', margin, yPosition);
  yPosition += lineHeight * 1.5;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');

  // Amount
  pdf.setFont('helvetica', 'bold');
  pdf.text('Amount Paid:', margin, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`$${data.amount}`, margin + 40, yPosition);
  yPosition += lineHeight;

  // Transaction ID
  pdf.setFont('helvetica', 'bold');
  pdf.text('Transaction ID:', margin, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.sessionId, margin + 40, yPosition);
  yPosition += lineHeight * 3;

  // Important Information Section
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Important Information', margin, yPosition);
  yPosition += lineHeight * 1.5;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  const importantNotes = [
    '• Please arrive 10 minutes before your scheduled appointment time',
    '• Bring a valid photo ID and your insurance card (if applicable)',
    '• You will receive a reminder email 24 hours before your appointment',
    '• To reschedule or cancel, please contact us at least 24 hours in advance',
    '• If you need to cancel, please call us at (555) 123-4567'
  ];

  importantNotes.forEach(note => {
    pdf.text(note, margin, yPosition);
    yPosition += lineHeight;
  });

  yPosition += lineHeight;

  // Footer
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  pdf.text(`Generated on: ${new Date().toLocaleString()}`, margin, yPosition);
  
  // Footer at bottom of page
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('SehatSetu - Your Health, Our Priority', margin, pageHeight - 15);
  pdf.text('For questions, contact us at info@sehatsetu.com | (555) 123-4567', margin, pageHeight - 10);

  // Save the PDF
  pdf.save(`appointment-confirmation-${data.appointmentId}.pdf`);
}

export async function generateMedicalReportPDF(data: MedicalReportData, download: boolean = true): Promise<jsPDF> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 5;
  let yPosition = margin;

  // Helper function to add text with word wrapping and page break handling
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize = 10, isBold = false) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = pdf.splitTextToSize(text, maxWidth);
    
    let currentY = y;
    lines.forEach((line: string) => {
      // Check if we need a new page before adding this line
      currentY = checkNewPage(currentY, lineHeight + 2);
      pdf.text(line, x, currentY);
      currentY += lineHeight;
    });
    
    return currentY;
  };

  // Helper function to check if we need a new page
  const checkNewPage = (currentY: number, requiredSpace: number = 20) => {
    if (currentY + requiredSpace > pageHeight - margin - 30) {
      pdf.addPage();
      return margin + 10; // Start a bit lower on new pages
    }
    return currentY;
  };

  // Title - Centered
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(24, 132, 171); // #1884ab color
  const titleText = 'Consultation Report';
  const titleWidth = pdf.getTextWidth(titleText);
  const titleX = (pageWidth - titleWidth) / 2;
  pdf.text(titleText, titleX, yPosition);
  pdf.setTextColor(0, 0, 0); // Reset to black
  yPosition += 15;

  // Doctor Details - Top right
  const doctorName = data.doctor?.name || '[Provider Name]';
  const doctorPhone = data.doctor?.phone || '[Contact no]';
  const doctorEmail = data.doctor?.email || '[Email]';
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(24, 132, 171);
  pdf.text(doctorName, pageWidth - margin - 50, yPosition);
  pdf.setTextColor(0, 0, 0);
  yPosition += lineHeight;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Contact no - ${doctorPhone}`, pageWidth - margin - 50, yPosition);
  yPosition += lineHeight;
  pdf.text(doctorEmail, pageWidth - margin - 50, yPosition);
  yPosition += lineHeight * 2;

  // First solid line separator
  pdf.setLineWidth(0.5);
  pdf.setDrawColor(100, 100, 100);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += lineHeight * 2;

  // Patient Information Section
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(24, 132, 171);
  pdf.text('Patient Information', margin, yPosition);
  pdf.setTextColor(0, 0, 0);
  yPosition += lineHeight;

  // Patient details in a simple format
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  const patientDetails = [
    `Patient Name: ${data.patientName}`,
    `Date: ${data.date}`,
    `Time: ${data.time}`,
    `Duration: ${data.duration || 'In Progress'}`,
    `Session ID: ${data.sessionId}`
  ];

  patientDetails.forEach((detail, index) => {
    pdf.text(detail, margin, yPosition + (index * 4));
  });

  yPosition += patientDetails.length * 4 + lineHeight * 2;

  // Second solid line separator
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += lineHeight * 2;

  // Consultation Summary Section
  yPosition = checkNewPage(yPosition, 20);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(24, 132, 171);
  pdf.text('Consultation Summary', margin, yPosition);
  pdf.setTextColor(0, 0, 0);
  yPosition += lineHeight * 2;

  // Process markdown summary with proper heading handling
  let summaryText = data.summary || 'Summary not generated yet';
  
  // Split summary into sections by markdown headers
  const sections = summaryText.split(/(?=##\s)/);
  
  sections.forEach((section) => {
    if (!section.trim()) return;
    
    // Check if this section starts with a header
    const headerMatch = section.match(/^##\s+(.+?)$/m);
    if (headerMatch) {
      const headerText = headerMatch[1].trim();
      const contentAfterHeader = section.replace(/^##\s+.+?$/m, '').trim();
      
      // Add some space before each section (except the first)
      if (sections.indexOf(section) > 0) {
        yPosition += lineHeight;
      }
      
      // Check if we need a new page for the header
      yPosition = checkNewPage(yPosition, lineHeight * 3);
      
      // Add the header with styling
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(24, 132, 171); // Blue color for headers
      pdf.text(headerText, margin, yPosition);
      pdf.setTextColor(0, 0, 0); // Reset to black
      
      pdf.setLineWidth(0.3);
      pdf.setDrawColor(24, 132, 171);
      const headerWidth = pdf.getTextWidth(headerText);
      pdf.line(margin, yPosition + 2, margin + headerWidth, yPosition + 2);
      pdf.setDrawColor(0, 0, 0); // Reset line color
      yPosition += lineHeight * 2;
      
      // Process the content after the header
      if (contentAfterHeader) {
        let processedContent = contentAfterHeader
          .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
          .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
          .replace(/^- /gm, '• ') // Convert bullet points
          .replace(/^\s*$/gm, '') // Remove empty lines
          .trim();
        
        // Add content with proper formatting
        yPosition = addWrappedText(processedContent, margin, yPosition, pageWidth - 2 * margin, 10, false);
        yPosition += lineHeight;
      }
    } else {
      // Handle content without headers (fallback)
      let processedContent = section
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
        .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
        .replace(/^- /gm, '• ') // Convert bullet points
        .replace(/^\s*$/gm, '') // Remove empty lines
        .trim();
      
      if (processedContent) {
        yPosition = addWrappedText(processedContent, margin, yPosition, pageWidth - 2 * margin, 10, false);
        yPosition += lineHeight;
      }
    }
  });
  
  yPosition += lineHeight;

  // Footer note
  yPosition = checkNewPage(yPosition, 15);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(107, 114, 128); // Gray color
  pdf.text('This report was generated using AI-powered transcription and medical summarization.', margin, yPosition);
  yPosition += lineHeight;
  pdf.text('For questions or concerns, please contact your healthcare provider.', margin, yPosition);

  // Footer at bottom of page
  const footerY = pageHeight - 15;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(24, 132, 171);
  pdf.text('SehatSetu - Your Health, Our Priority', margin, footerY);

  if(download){
    const fileName = `consultation-report-${data.patientName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
    pdf.save(fileName);
  }
  return pdf;
}

export async function generatePDFFromElement(element: HTMLElement, fileName: string): Promise<void> {
  try {
    // Create canvas from HTML element
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Calculate PDF dimensions
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    const pdf = new jsPDF('p', 'mm', 'a4');
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(fileName);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    throw new Error('PDF generation failed');
  }
} 