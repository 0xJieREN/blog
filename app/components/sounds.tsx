'use client'

import { useEffect } from 'react'

/*
 * Quiet interface sounds, after raphaelsalaja.com, synthesised with Web Audio
 * so there are no audio files to load. Chosen by ear on an audition page:
 * - tap: clicking a link that goes somewhere. A press and a release 28ms
 *   apart, each a few ms of narrow-band noise, like a good key switch.
 * - tick: clicking an in-page anchor (heading #). The press alone, a little
 *   higher, because it marks a place instead of leaving the page.
 * - slide: the mouse moving onto another row of a post list. A 5ms breath of
 *   high noise, barely there, because a sweep can fire it many times.
 * Everything is short and bright, so the bus lowpass sits at 12kHz and only
 * trims harshness. Pitch shifts by up to 3% so repeats do not sound
 * mechanical. Sounds follow prefers-reduced-motion, the closest system signal
 * for "keep it calm".
 */

type Kind = 'tap' | 'tick' | 'slide'

// Rows that play `slide` when the mouse moves onto them.
const LIST_ROWS = '.featured-link, .post-link'
// A fast sweep crosses a row every few ms; closer slides blur into a buzz.
const SLIDE_GAP_MS = 45
// Picked at 140% of the audition page's level, which had a 0.8 bus gain.
const VOLUME = 1.12

let context: AudioContext | null = null
let bus: AudioNode | null = null
let noise: AudioBuffer | null = null

function getContext() {
  if (!context) {
    if (typeof AudioContext === 'undefined') return null
    context = new AudioContext({ latencyHint: 'interactive' })
  }
  if (context.state === 'suspended') context.resume()
  return context
}

function getBus(ctx: AudioContext) {
  if (!bus) {
    let lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 12000
    lowpass.Q.value = 0.5
    let gain = ctx.createGain()
    gain.gain.value = VOLUME
    lowpass.connect(gain).connect(ctx.destination)
    bus = lowpass
  }
  return bus
}

type Shape = {
  peak: number
  duration: number
  // Seconds after now. Lets one sound hold several events, like a release.
  delay?: number
}

// Gain rises over 0.8ms, then decays exponentially: fast enough to stay
// crisp, slow enough not to pop.
function envelope(ctx: AudioContext, start: number, shape: Shape) {
  let gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(shape.peak, start + 0.0008)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + shape.duration)
  return gain
}

function tone(ctx: AudioContext, frequency: number, shape: Shape) {
  let start = ctx.currentTime + (shape.delay ?? 0)
  let osc = ctx.createOscillator()
  osc.frequency.value = frequency
  osc.connect(envelope(ctx, start, shape)).connect(getBus(ctx))
  osc.start(start)
  osc.stop(start + shape.duration + 0.02)
}

// Filtered white noise.
function hiss(
  ctx: AudioContext,
  filter: BiquadFilterType,
  frequency: number,
  q: number,
  shape: Shape
) {
  if (!noise || noise.sampleRate !== ctx.sampleRate) {
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate / 10), ctx.sampleRate)
    let data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  let start = ctx.currentTime + (shape.delay ?? 0)
  let source = ctx.createBufferSource()
  source.buffer = noise
  let band = ctx.createBiquadFilter()
  band.type = filter
  band.frequency.value = frequency
  band.Q.value = q
  source
    .connect(band)
    .connect(envelope(ctx, start, shape))
    .connect(getBus(ctx))
  source.start(start)
  source.stop(start + shape.duration + 0.02)
}

function play(ctx: AudioContext, kind: Kind) {
  let pitch = 0.97 + Math.random() * 0.06

  if (kind === 'tap') {
    hiss(ctx, 'bandpass', 3400 * pitch, 2, { peak: 0.06, duration: 0.006 })
    tone(ctx, 1700 * pitch, { peak: 0.015, duration: 0.008 })
    hiss(ctx, 'bandpass', 4600 * pitch, 2, {
      peak: 0.03,
      duration: 0.005,
      delay: 0.028,
    })
  } else if (kind === 'tick') {
    hiss(ctx, 'bandpass', 4200 * pitch, 2, { peak: 0.045, duration: 0.005 })
    tone(ctx, 2100 * pitch, { peak: 0.01, duration: 0.006 })
  } else {
    hiss(ctx, 'highpass', 7000 * pitch, 0.7, { peak: 0.022, duration: 0.005 })
  }
}

function classifyClick(target: EventTarget | null): Kind | null {
  if (!(target instanceof Element)) return null
  let link = target.closest('a[href]')
  if (!link) return null
  return link.getAttribute('href')!.startsWith('#') ? 'tick' : 'tap'
}

export function Sounds() {
  useEffect(() => {
    let reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    let row: Element | null = null
    let lastSlide = 0

    // Browsers only let audio start after a press or key, never a hover, so
    // the first press anywhere wakes the context. Until then hovers are
    // silent.
    function onPress() {
      if (!reduce.matches) getContext()
    }

    // Capture phase, so the sound starts before Next's <Link> handles the
    // click. Keyboard activation also fires click, with button 0.
    function onClick(event: MouseEvent) {
      if (reduce.matches || event.button !== 0) return
      let kind = classifyClick(event.target)
      let ctx = kind && getContext()
      if (!ctx) return
      try {
        play(ctx, kind!)
      } catch {
        // Sound is decoration; never let it break navigation.
      }
    }

    // pointerover also fires between a row's own children, so only a change
    // of row counts. Touch is skipped: a tap already plays `tap`.
    function onOver(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return
      let next =
        event.target instanceof Element ? event.target.closest(LIST_ROWS) : null
      if (next === row) return
      row = next
      if (!next || reduce.matches || context?.state !== 'running') return
      let now = performance.now()
      if (now - lastSlide < SLIDE_GAP_MS) return
      lastSlide = now
      try {
        play(context, 'slide')
      } catch {}
    }

    document.addEventListener('pointerdown', onPress, true)
    document.addEventListener('keydown', onPress, true)
    document.addEventListener('click', onClick, true)
    document.addEventListener('pointerover', onOver)
    return () => {
      document.removeEventListener('pointerdown', onPress, true)
      document.removeEventListener('keydown', onPress, true)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('pointerover', onOver)
    }
  }, [])

  return null
}
