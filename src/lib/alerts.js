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

// Fires a sample notification + beep so the user can check their setup.
// Returns the permission state, or 'error' if the browser refused to show it.
export async function sendTestNotification() {
  primeAudio()
  beep()
  const permission = await requestNotificationPermission()
  if (permission !== 'granted') return permission
  try {
    new Notification('測試通知', {
      body: '看到這則訊息,代表有貨時你會收到通知。',
      // a fixed tag would replace the previous one silently, so make each unique
      tag: `asm-test-${Date.now()}`,
    })
    return 'granted'
  } catch {
    return 'error'
  }
}

export function notifyAvailable(row) {
  if (notificationPermission() !== 'granted') return
  const stores = row.stores.filter(s => s.status).map(s => s.store)
  new Notification(`${shortName(row)} 有貨了`, {
    body: `${describe(row)}\n${stores.join('、')}`,
    tag: row.sku,
  })
}
