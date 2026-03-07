# GenAI-YOLO: Camera Detection Pipeline with Indian Sign Board Dataset

## Understanding the Request

The user wants to build a real-time camera-to-detection pipeline where:

1. Camera frames are sent to a backend for AI-powered detection (traffic lights, signs, density)
2. The Indian Sign Board dataset from Kaggle is integrated as knowledge for the detection model
3. Detection results drive the UI (bounding boxes, signal status, density, notifications)

## Key Constraint

Real YOLO model inference cannot run in the browser or in edge functions (as noted in project memory). However, we **can** use Lovable AI (Gemini vision models) as a proxy for detection -- sending camera frames as images to an edge function that uses `google/gemini-2.5-flash` (which supports image input) to identify traffic signs, lights, and density from the frame. This gives real detection results without needing a separate ML server.

The Kaggle dataset contains Indian road signs. We'll embed knowledge of these sign categories directly into the AI system prompt so the model knows what to look for.

## Architecture

```text
Browser Camera (getUserMedia)
    │
    ├─ Every N seconds, capture frame as base64 JPEG
    │
    ▼
Edge Function: detect-frame
    │
    ├─ Receives base64 image
    ├─ Sends to Lovable AI (Gemini 2.5 Flash - vision)
    │   with system prompt containing Indian sign board classes
    ├─ Uses tool calling to extract structured output:
    │   { lights: [{state, confidence}], signs: [{label, bbox}], density: "Low"|"Medium"|"High", action: string }
    │
    ▼
Frontend receives JSON
    │
    ├─ Draws bounding boxes on canvas overlay
    ├─ Updates ActionPanel (signal state)
    ├─ Updates DensityPanel (real density)
    ├─ Triggers notifications if conditions met
    └─ Matches detections to route signals (if route active)
```

## Plan

### 1. Create `detect-frame` edge function

- Accepts `{ image: string (base64), routeContext?: { currentSignal, totalSignals } }`
- System prompt includes all Indian sign board categories from the Kaggle dataset (speed limit, stop, no parking, no entry, one way, school zone, hospital, railway crossing, etc.)
- Uses Lovable AI with `google/gemini-2.5-flash` (vision-capable) via tool calling to return structured detections
- Returns: `{ detections: [{label, confidence, bbox: {x,y,w,h}}], lightState: "red"|"yellow"|"green"|null, density: "Low"|"Medium"|"High", action: string, countdown: number }`
- Register in `config.toml` with `verify_jwt = false`

### 2. Update `LiveFeedPanel.tsx` - Frame capture and canvas overlay

- When camera is active, capture a frame every 3 seconds using a hidden canvas
- Convert to base64 JPEG and POST to the `detect-frame` edge function
- Draw bounding boxes and labels on a canvas overlay positioned over the video element
- Store detection results in `DashboardContext` so other panels can consume them

### 3. Update `DashboardContext.tsx` - Add detection state

- Add `detections` state (array of detected objects with labels, confidence, bounding boxes)
- Add `detectedLightState` (red/yellow/green/null)
- Add `detectedDensity` (Low/Medium/High)
- Add `detectedAction` and `detectedCountdown`

### 4. Update `ActionPanel.tsx` - Use real detections

- When camera is active and detections are available, use `detectedLightState` instead of the cycling simulation
- Show real detected action text and countdown
- Fall back to simulation when no detections available

### 5. Update `DensityPanel.tsx` - Use real density

- When real `detectedDensity` is available from camera detections, display it instead of random simulation
- Fall back to simulated values when camera is off

### 6. Trigger notifications from detections

- When camera detects red light + high density, fire an SMS/email notification via the existing `send-sms` function for subscribed users
- Throttle to avoid spam (max 1 alert per 2 minutes)

### 7. Route-aware detection context

- When a route is active, pass `routeContext` (current signal index, total signals) to the detection function
- The AI can then output messages like "Signal 3/7: RED -- wait ~18 seconds"

## Indian Sign Board Categories (embedded in prompt)

From the Kaggle dataset, the system prompt will include recognition targets for: Speed Limit signs (various), Stop, No Parking, No Entry, One Way, Turn Restrictions, School Zone, Hospital Zone, Railway Crossing, Pedestrian Crossing, Roundabout, U-Turn, No Horn, No Overtaking, Road Work Ahead, Speed Breaker, and other common Indian road signs.

## Technical Notes

- Gemini 2.5 Flash supports image inputs and is cost-effective for frequent frame analysis
- Frame capture at 3-second intervals balances responsiveness with API costs
- Tool calling ensures structured JSON output (no parsing issues)
- Canvas overlay uses absolute positioning over the video element for bounding box rendering

&nbsp;

rest of the working must be same  only the changes must be in the camera part.