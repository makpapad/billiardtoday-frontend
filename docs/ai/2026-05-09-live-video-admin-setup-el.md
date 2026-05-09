# Live Video Setup στον Admin

Ο στόχος είναι να συνδέσουμε ένα παιχνίδι με live video, ώστε να εμφανίζεται στο live page μαζί με το scoreboard overlay.

## Τι βάζουμε στον Admin

Στο modal **Send to Scoreboard** του admin, στο stream/video section:

- **Stream source**: `MediaMTX`
- **Stream URL**:

```text
https://live.billiardtoday.com/btdroitcamera/
```

Αυτό είναι το URL που βλέπει το site. Δεν βάζουμε εδώ RTMP ή RTSP publish URL.

## Τι στέλνει το OBS

Για κάμερα από laptop ή OBS scene:

**Settings -> Stream**

```text
Service: Custom
Server: rtmp://live.billiardtoday.com
Stream Key: btdroitcamera
```

Το `Use authentication` είναι κλειστό για το path `btdroitcamera`.

**Settings -> Output -> Streaming**

Προτεινόμενα:

```text
Encoder: x264 ή NVENC H.264
Rate Control: CBR
Bitrate: 4500-6000 Kbps για 1080p60
Keyframe Interval: 2 s
Profile: main
x264 Options: bframes=0 keyint=60 scenecut=0
```

Αν υπάρχει επιλογή `Tune`, βάζουμε:

```text
zerolatency
```

Το `bframes=0` είναι απαραίτητο αν χρησιμοποιηθεί WebRTC playback. Στο production πλέον το MediaMTX provider παίζει μέσω HLS για να περνάει και ο ήχος από OBS/AAC.

## Τι στέλνει το BTDroitCamera

Για κινητό με την εφαρμογή BTDroitCamera:

```text
rtsp://btdroit:dEn03pyixReQHz7u4ERJtmdc@live.billiardtoday.com:8554/btdroitcamera
```

Αυτό είναι publish URL. Μπαίνει μόνο στην εφαρμογή, όχι στον admin.

## URLs προβολής

Άμεσο MediaMTX player:

```text
https://live.billiardtoday.com/btdroitcamera/
```

HLS playlist:

```text
https://live.billiardtoday.com/btdroitcamera/index.m3u8
```

Test page με scoreboard overlay:

```text
http://localhost:3022/test/live-overlay?provider=mediamtx&overlay=Ceb1
```

Production live page:

```text
https://billiardtoday.com/live
```

## Γρήγορος έλεγχος αν παίζει

Στον server:

```bash
curl -s http://127.0.0.1:9997/v3/paths/list
```

Πρέπει να υπάρχει path:

```text
btdroitcamera
ready: true
source: rtmpConn ή rtspSession
tracks: H264, MPEG-4 Audio
```

Αν στο site δεν φαίνεται video, κοιτάμε:

```bash
journalctl -u mediamtx --no-pager -n 120
```

Συνήθη μηνύματα:

- `no stream is available on path 'btdroitcamera'`: δεν στέλνει OBS/κινητό.
- `authentication failed`: λάθος OBS auth/settings ή λάθος URL.
- `WebRTC doesn't support H264 streams with B-frames`: το OBS στέλνει B-frames, θέλει `bframes=0` ή HLS playback.

## Σημαντική διάκριση URL

Admin/site playback:

```text
https://live.billiardtoday.com/btdroitcamera/
```

OBS publish:

```text
rtmp://live.billiardtoday.com
Stream Key: btdroitcamera
```

BTDroitCamera publish:

```text
rtsp://btdroit:dEn03pyixReQHz7u4ERJtmdc@live.billiardtoday.com:8554/btdroitcamera
```
