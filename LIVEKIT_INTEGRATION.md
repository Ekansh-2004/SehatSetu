# LiveKit Video Consultation Integration

This guide documents the complete LiveKit integration for video consultations in the clinic application.

## Overview

The LiveKit integration enables real-time video consultations between doctors and patients. The system includes:

- **Patient Experience**: Pre-join screen with camera/microphone testing and a full-featured meeting room
- **Doctor Experience**: Video tile integrated into the consultation dashboard
- **Email Notifications**: Automatic email delivery with meeting room links after appointment booking
- **Room Management**: Secure room creation and token-based access control

## Architecture

### Components Created

1. **API Routes**
   - `apps/web/src/app/api/livekit/token/route.ts` - Access token generation
   - `apps/web/src/app/api/livekit/room/route.ts` - Room creation and management
2. **Patient Components**
   - `apps/web/src/components/video/PatientPreJoin.tsx` - Pre-join screen with device testing
   - `apps/web/src/components/video/PatientMeetingRoom.tsx` - Full-featured meeting room
   - `apps/web/src/app/consultation/[roomId]/page.tsx` - Patient consultation page

3. **Doctor Components**
   - `apps/web/src/components/video/DoctorVideoTile.tsx` - Video tile for doctor dashboard

4. **Email Service**
   - `apps/web/src/lib/email.ts` - Email service for appointment confirmations

## Setup Instructions

### 1. Environment Variables

Add the following environment variables to your `.env` file:

```env
# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here
LIVEKIT_WS_URL=wss://your-livekit-server.com

# Email Service (Resend)
RESEND_API_KEY=your_resend_api_key_here

# App URL for email links
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. LiveKit Server Setup

You need a LiveKit server running. Options:

#### Option A: LiveKit Cloud (Recommended)

1. Sign up at [LiveKit Cloud](https://cloud.livekit.io/)
2. Create a new project
3. Copy the API Key, API Secret, and WebSocket URL
4. Update your `.env` file with these values

#### Option B: Self-hosted

1. Follow the [LiveKit server deployment guide](https://docs.livekit.io/deploy/)
2. Update the `LIVEKIT_WS_URL` to point to your server

### 3. Email Service Setup

1. Sign up for [Resend](https://resend.com/)
2. Get your API key from the dashboard
3. Update `RESEND_API_KEY` in your `.env` file
4. Verify your sending domain (for production)

## Usage Flow

### For Patients

1. **Appointment Booking**: Patient books appointment and receives email with meeting link
2. **Pre-join**: Patient clicks link and goes through pre-join screen to test camera/microphone
3. **Meeting**: Patient joins the video consultation room
4. **Features Available**:
   - Video/audio controls
   - Chat functionality
   - Full-screen mode
   - Leave meeting

### For Doctors

1. **Consultation Dashboard**: Doctor sees video tile in their consultation interface
2. **Start Call**: Doctor clicks "Start Video Call" to begin consultation
3. **Features Available**:
   - Video/audio controls
   - Expandable video view
   - Participant management
   - End call functionality

## API Endpoints

### POST `/api/livekit/token`

Generates access tokens for participants.

**Request Body:**

```json
{
  "roomName": "appointment-123",
  "participantName": "John Doe",
  "participantRole": "patient" | "doctor"
}
```

**Response:**

```json
{
  "token": "jwt_token_here",
  "wsUrl": "wss://your-livekit-server.com"
}
```

### POST `/api/livekit/room`

Creates a new consultation room.

**Request Body:**

```json
{
  "roomName": "appointment-123",
  "appointmentId": "123",
  "maxParticipants": 2
}
```

### GET `/api/livekit/room?roomName=appointment-123`

Gets room information and current participants.

### DELETE `/api/livekit/room?roomName=appointment-123`

Deletes a room.

## Email Templates

The system sends beautiful HTML email templates with:

- Appointment details
- Meeting room link
- Pre-join instructions
- Technical requirements
- Support information

## Security Features

- **Token-based Authentication**: Secure JWT tokens for room access
- **Time-limited Access**: Tokens expire after 10 minutes
- **Role-based Permissions**: Different permissions for doctors vs patients
- **Room Isolation**: Each appointment gets its own secure room

## Customization

### Styling

The components use Tailwind CSS and can be customized by modifying the className props.

### Email Templates

Modify `apps/web/src/lib/email.ts` to customize email content and styling.

### Video Quality

Adjust video quality settings in the Room configuration:

```typescript
const room = new Room({
  adaptiveStream: true,
  dynacast: true,
  videoCaptureDefaults: {
    resolution: {
      width: 1280,
      height: 720,
    },
  },
});
```

## Troubleshooting

### Common Issues

1. **"Failed to get user media"**
   - Ensure HTTPS in production
   - Check browser permissions
   - Verify camera/microphone access

2. **"Connection failed"**
   - Verify LiveKit server is running
   - Check WebSocket URL is correct
   - Ensure firewall allows WebSocket connections

3. **"Token expired"**
   - Tokens are valid for 10 minutes
   - Implement token refresh if needed

4. **"Email not sending"**
   - Verify Resend API key
   - Check domain verification status
   - Review email logs in Resend dashboard

### Development Tips

1. **Local Development**: Use `ws://localhost:7880` for local LiveKit server
2. **HTTPS Required**: Video/audio requires HTTPS in production
3. **Testing**: Use browser dev tools to simulate different network conditions
4. **Logging**: Check browser console and server logs for detailed error information

## Production Considerations

1. **Scaling**: LiveKit can handle thousands of concurrent rooms
2. **Recording**: Enable server-side recording for compliance
3. **Analytics**: Monitor connection quality and participant engagement
4. **Bandwidth**: Consider adaptive bitrate for mobile users
5. **Backup**: Implement fallback audio-only mode for poor connections

## Dependencies Added

- `livekit-client`: Client SDK for video calling
- `livekit-server-sdk`: Server SDK for token generation and room management
- `resend`: Modern email API for sending notifications

## Integration Points

The LiveKit integration touches these existing systems:

- Appointment booking flow (modified to send emails)
- Doctor consultation dashboard (added video tile)
- Database models (uses existing appointment IDs)
- Authentication system (integrates with current user management)

## Future Enhancements

Possible future improvements:

- Screen sharing capabilities
- Recording and playback
- Waiting room functionality
- Multi-party consultations
- Mobile app integration
- AI-powered meeting insights

---

For technical support or questions, please refer to the [LiveKit documentation](https://docs.livekit.io/) or contact the development team.
