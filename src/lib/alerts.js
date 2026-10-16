import { shortName, describe } from './devices'

let audio

// Browsers only allow audio after a user gesture, so call this from a click.
export function primeAudio() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)()
    audio.resume?.()
  } catch {
    // no audio support
  }
}

export function beep() {
  if (!audio) return
  const now = audio.currentTime
  ;[880, 1320].forEach((freq, i) => {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.2, now + i * 0.18)
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.16)
    osc.connect(gain).connect(audio.destination)
    osc.start(now + i * 0.18)
    osc.stop(now + i * 0.18 + 0.17)
  })
}

export const notificationSupported = () => typeof Notification !== 'undefined'
export const notificationPermission = () => (notificationSupported() ? Notification.permission : 'unsupported')

export async function requestNotificationPermission() {
  if (!notificationSupported()) return 'unsupported'
  return Notification.permission === 'default' ? Notification.requestPermission() : Notification.permission
}

export function notifyAvailable(row) {
  if (notificationPermission() !== 'granted') return
  const stores = row.stores.filter(s => s.status).map(s => s.store)
  new Notification(`${shortName(row)} 有貨了`, {
    body: `${describe(row)}\n${stores.join('、')}`,
    tag: row.sku,
  })
}
