---
title: "🎥 Streaming Pipeline"
sidebar_position: 3
---

# 🎥 Streaming Pipeline

Πώς γίνεται το live streaming των αγώνων από την κάμερα μέχρι τον θεατή.

👉 [Άνοιγμα διαγράμματος Streaming](/diagrams/billiardtoday-streaming-pipeline.html)

## Η Ροή (3 Φάσεις)

### Phase 1: Video Producers
Η κάμερα στέλνει video μέσω 3 πρωτοκόλλων:

| Συσκευή | Πρωτόκολλο | Port |
|---------|------------|------|
| Electron (Desktop) | RTMP (FFmpeg) | 1935 |
| Android (Native) | RTSP | 8554 |
| Browser | WHIP (WebRTC) | 8889 |

### Phase 2: MediaMTX Server
Ο **MediaMTX** λαμβάνει το stream και το αναμεταδίδει:

```
live.billiardtoday.com
├── INGEST:  RTMP (:1935) · RTSP (:8554) · WHIP (:8889)
├── TRANSCODE: SRT · HLS segmentation
└── OUTGEST:  HLS (.m3u8) · WHEP (WebRTC) · Direct URL
```

### Phase 3: Playback Consumers
Ο θεατής βλέπει το stream με 3 τρόπους:

| Μέθοδος | Τεχνολογία | Latency |
|---------|-----------|---------|
| HLS Player | HTTP Live Streaming | 5-10s |
| WHEP Reader | WebRTC | &lt;500ms |
| Direct Video | Native player | 2-5s |

## Key Files

| Αρχείο | Ρόλος |
|--------|-------|
| `browserFriendlyRecordingRuntime.ts` | Browser WHIP publish |
| `friendlyRecordingRuntime.ts` | Electron/Android router |
| `LiveVideoDrawer.tsx` | Consumer: HLS / WHEP / Direct |
| `FriendlyRecordingFastPreview.tsx` | WHEP preview |

## ⚠️ Σημαντικό

Ο **MediaSoup SFU** (port 4000) στο `6-webrtc-server` είναι **πειραματικός** και **δεν χρησιμοποιείται** στο production. Όλο το streaming περνάει από τον **MediaMTX**.