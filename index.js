const $start = document.querySelector('#start')
const $stop = document.querySelector('#stop')
const $status = document.querySelector('#status')
const $format = document.querySelector('#format')
const $preview = document.querySelector('#preview')
const $includeMic = document.querySelector('#includeMic')

let mediaRecorder = null
let displayStream = null
let micStream = null
let mixedStream = null
let audioContext = null
let recordedChunks = []
let currentMimeType = ''
let lastPreviewUrl = ''

const RECORDER_TYPES = [
  'video/mp4;codecs=h264,aac',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

const updateStatus = text => {
  $status.textContent = text
}

const pickSupportedMimeType = () => {
  for (const type of RECORDER_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

const stopTracks = stream => {
  if (!stream) return
  stream.getTracks().forEach(track => track.stop())
}

const cleanup = () => {
  stopTracks(displayStream)
  stopTracks(micStream)
  stopTracks(mixedStream)

  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close()
  }

  displayStream = null
  micStream = null
  mixedStream = null
  mediaRecorder = null
  audioContext = null
  recordedChunks = []

  $start.disabled = false
  $stop.disabled = true
}

const downloadRecording = blob => {
  const extension = blob.type.includes('mp4') ? 'mp4' : 'webm'
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `grabacion-${timestamp}.${extension}`

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
}

const showFinalPreview = blob => {
  if (lastPreviewUrl) {
    URL.revokeObjectURL(lastPreviewUrl)
    lastPreviewUrl = ''
  }

  const previewUrl = URL.createObjectURL(blob)
  lastPreviewUrl = previewUrl

  $preview.srcObject = null
  $preview.src = previewUrl
  $preview.controls = true
  $preview.muted = false
  $preview.play().catch(() => {})
}

const buildMixedStream = () => {
  const videoTrack = displayStream.getVideoTracks()[0]
  const resultStream = new MediaStream([videoTrack])

  audioContext = new AudioContext()
  const destination = audioContext.createMediaStreamDestination()

  let hasAudioSource = false

  if (displayStream.getAudioTracks().length > 0) {
    const displayAudioSource = audioContext.createMediaStreamSource(displayStream)
    displayAudioSource.connect(destination)
    hasAudioSource = true
  }

  if (micStream && micStream.getAudioTracks().length > 0) {
    const micAudioSource = audioContext.createMediaStreamSource(micStream)
    micAudioSource.connect(destination)
    hasAudioSource = true
  }

  if (hasAudioSource) {
    destination.stream
      .getAudioTracks()
      .forEach(track => resultStream.addTrack(track))
  }

  return resultStream
}

const startRecording = async () => {
  try {
    $start.disabled = true
    updateStatus('Solicitando permisos...')

    displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: 30, max: 60 } },
      audio: true,
    })

    micStream = null

    if ($includeMic.checked) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
          video: false,
        })
      } catch (error) {
        console.warn('No se pudo acceder al micrófono.', error)
        updateStatus('Micrófono no disponible. Grabando sin micrófono...')
      }
    }

    mixedStream = buildMixedStream()
    currentMimeType = pickSupportedMimeType()

    if (!currentMimeType) {
      throw new Error('Tu navegador no soporta MediaRecorder con MP4/WebM.')
    }

    $format.textContent = currentMimeType
    $preview.pause()
    $preview.removeAttribute('src')
    $preview.load()
    $preview.srcObject = displayStream
    $preview.controls = false
    $preview.muted = true

    mediaRecorder = new MediaRecorder(mixedStream, {
      mimeType: currentMimeType,
      videoBitsPerSecond: 6_000_000,
    })

    recordedChunks = []
    mediaRecorder.ondataavailable = event => {
      if (event.data && event.data.size > 0) recordedChunks.push(event.data)
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: currentMimeType })
      if (blob.size > 0) {
        showFinalPreview(blob)
        downloadRecording(blob)
        updateStatus('Grabación finalizada y descargada.')
      } else {
        updateStatus('No se pudo generar archivo de video.')
      }
      cleanup()
    }

    displayStream.getVideoTracks()[0].addEventListener('ended', () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop()
      }
    })

    mediaRecorder.start(250)
    updateStatus(
      micStream
        ? 'Grabando pantalla + micrófono...'
        : 'Grabando pantalla sin micrófono...'
    )
    $stop.disabled = false
  } catch (error) {
    console.error(error)
    updateStatus(`Error: ${error.message}`)
    cleanup()
  }
}

const stopRecording = () => {
  if (!mediaRecorder || mediaRecorder.state !== 'recording') return
  updateStatus('Deteniendo grabación...')
  mediaRecorder.stop()
}

$start.addEventListener('click', startRecording)
$stop.addEventListener('click', stopRecording)
