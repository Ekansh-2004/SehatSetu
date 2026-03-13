# Quick LiveKit Setup for Development

Since you're seeing a black screen instead of the patient's video, here's a quick setup guide to get LiveKit working.

## Option 1: LiveKit Cloud (Easiest - Recommended)

1. **Sign up for LiveKit Cloud**:
   - Go to https://cloud.livekit.io/
   - Create a free account
   - Create a new project

2. **Get your credentials**:
   - Copy the **API Key**
   - Copy the **API Secret**
   - Copy the **WebSocket URL** (should look like `wss://your-project.livekit.cloud`)

3. **Update your .env file**:

   ```env
   LIVEKIT_API_KEY=your_actual_api_key_here
   LIVEKIT_API_SECRET=your_actual_api_secret_here
   LIVEKIT_WS_URL=wss://your-project.livekit.cloud
   RESEND_API_KEY=your_resend_api_key_here
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Restart your development server**:
   ```bash
   npm run dev
   ```

## Option 2: Local LiveKit Server (For Development)

1. **Install Docker** (if not already installed)

2. **Run LiveKit server locally**:

   ```bash
   docker run --rm \
     -p 7880:7880 \
     -p 7881:7881 \
     -p 7882:7882/udp \
     -e LIVEKIT_KEYS="devkey: devsecret" \
     livekit/livekit-server:latest \
     --dev
   ```

3. **Update your .env file**:
   ```env
   LIVEKIT_API_KEY=devkey
   LIVEKIT_API_SECRET=devsecret
   LIVEKIT_WS_URL=ws://localhost:7880
   RESEND_API_KEY=your_resend_api_key_here
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

## Testing

1. Book an appointment (or navigate to `/consultation/testroom` directly)
2. You should now see:
   - Patient's video immediately (via getUserMedia fallback)
   - Connection status in the UI
   - Debug logs in browser console (press F12)

## Troubleshooting

### Check Browser Console

Press F12 and look for:

- `🎥` emoji logs showing video track status
- `🔄` emoji logs showing participant updates
- Any red error messages

### Common Issues

1. **"Failed to get access token"** → Check your API keys
2. **"Connection failed"** → Check your WebSocket URL
3. **Camera permissions** → Make sure you allow camera access

### Temporary Workaround

The current implementation shows your camera via `getUserMedia` immediately, so you should see your video even if LiveKit isn't configured yet. If you don't see ANY video:

1. Check camera permissions in browser
2. Try a different browser
3. Check browser console for errors

## Email Setup (Optional for now)

For the Resend email service:

1. Sign up at https://resend.com/
2. Get your API key
3. Add it to `RESEND_API_KEY` in .env

---

**Quick Test**: Try going to `/consultation/testroom` - you should see your camera feed immediately!
