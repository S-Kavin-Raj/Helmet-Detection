# Annotated API & Frontend Behavior

## /detect endpoint

- Accepts multipart/form-data with fields:
  - `image`: file (required)
  - `mode`: one of `image`, `video`, `webcam` (optional; default `image`)
  - `annotated`: `true`/`false` (optional; default `false`)

Behavior:

- By default, `/detect` returns **compact JSON** containing `detections` and `stats`.
- If `annotated=true`, the response will also include an `image` field containing a base64 JPEG of the annotated frame.

Why:

- Returning the annotated image by default leads to very large responses that can flood logs and network channels.
- The default compact behavior returns bounding boxes and labels for client-side rendering, which is faster and more bandwidth-friendly.

## Frontend defaults and recommendations

- The frontend sends `annotated=false` by default for webcam & video live flows and will draw detections client-side to the canvas.
- For single-image (upload) analysis, the frontend requests `annotated=true` to show a server-rendered annotated image (better UX for snapshots).

Performance tuning:

- `FRAME_SKIP`: The frontend uses frame skipping to reduce the number of frames sent to the server (default 3). Increase to reduce load.
- `MIN_FRAME_INTERVAL_MS`: The frontend enforces a minimum time between POSTs (default 250ms, about 4 FPS).

If you need real-time detection for many clients, consider switching to a streaming approach (WebRTC or a socket-based stream) or moving detection entirely to the client (WebAssembly or TF.js) depending on constraints.
