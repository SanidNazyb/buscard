import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

const RADIUS = 1.7
const SPIN_END = 1.35
const OPEN_END = 1.79
const FALL_START = OPEN_END
const FALL_SPEED = 2 / 1.75
const END = FALL_START + .71 / FALL_SPEED
const OPEN_DURATION = OPEN_END - SPIN_END

function easeInOut(t) { return t * t * (3 - 2 * t) }
function clamp(t) { return Math.max(0, Math.min(1, t)) }
// A strong initial impulse that slows down while retaining motion at the fall handoff.
function openingProgress(t) { return 2.5 * t - 2.25 * t * t + .75 * t * t * t }
function spinProgress(t) {
  if (t < .12) return -.018 * easeInOut(t / .12)
  const turn = (t - .12) / .88
  return -.018 + 1.018 * (1 - Math.pow(1 - turn, 3.3))
}

function createMarkTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 1024
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '800 245px Arial, sans-serif'
  ctx.fillText('</>', 512, 520)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.anisotropy = 8
  return texture
}

function hemisphereGeometry(radius, phiStart) {
  const phiLength = Math.PI
  const geometry = new THREE.SphereGeometry(radius, 96, 64, phiStart, phiLength)
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) {
    const phi = phiStart + (1 - uv.getX(i)) * phiLength
    uv.setX(i, 1 - phi / (Math.PI * 2))
  }
  uv.needsUpdate = true
  return geometry
}

function createHalf(phiStart, outerMaterial, markMaterial, innerMaterial, edgeMaterial) {
  const half = new THREE.Group()
  half.add(new THREE.Mesh(hemisphereGeometry(RADIUS, phiStart), outerMaterial))
  half.add(new THREE.Mesh(hemisphereGeometry(RADIUS + .012, phiStart), markMaterial))
  const innerFace = new THREE.Mesh(new THREE.CircleGeometry(RADIUS - .012, 96), innerMaterial)
  innerFace.rotation.y = Math.PI / 2
  innerFace.visible = false
  half.userData.innerFace = innerFace
  half.add(innerFace)
  const edge = new THREE.Mesh(new THREE.TorusGeometry(RADIUS - .012, .018, 10, 96), edgeMaterial)
  edge.rotation.y = Math.PI / 2
  edge.layers.set(1)
  half.add(edge)
  return half
}

export default function ThreeSphere({ onReveal, onDone, panelRef, frameRef }) {
  const mount = useRef(null)
  const rimMount = useRef(null)
  const callbacks = useRef({ onReveal, onDone })
  callbacks.current = { onReveal, onDone }

  useEffect(() => {
    const host = mount.current
    if (!host) return
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
    } catch {
      callbacks.current.onReveal()
      callbacks.current.onDone()
      return
    }
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    renderer.domElement.setAttribute('aria-hidden', 'true')
    host.appendChild(renderer.domElement)
    let rimRenderer
    try {
      rimRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
      rimRenderer.setClearColor(0x000000, 0)
      rimRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
      rimRenderer.domElement.setAttribute('aria-hidden', 'true')
      rimMount.current.appendChild(rimRenderer.domElement)
    } catch {
      rimRenderer?.dispose()
      rimRenderer = null
    }

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-2.46, 2.46, 2.46, -2.46, .1, 100)
    camera.position.set(0, 0, 7.8)
    camera.lookAt(0, 0, 0)
    const rimCamera = camera.clone()
    rimCamera.layers.set(1)

    scene.add(new THREE.AmbientLight(0xffffff, .62))
    const key = new THREE.DirectionalLight(0xffffff, 1.15)
    key.position.set(-3, 4, 5)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xffffff, .9)
    rim.position.set(3, 1, -4)
    scene.add(rim)
    const texture = createMarkTexture()
    const outerMaterial = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vView = vec3(0.0, 0.0, 1.0);
          gl_Position = projectionMatrix * viewPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vec3 normal = normalize(vNormal);
          if (!gl_FrontFacing) normal = -normal;
          float facing = max(dot(normal, normalize(vView)), 0.0);
          float rim = pow(1.0 - facing, 4.5);
          float softLight = pow(max(dot(normal, normalize(vec3(-0.45, 0.62, 0.66))), 0.0), 2.0);
          vec3 graphite = vec3(0.025, 0.029, 0.032) + softLight * vec3(0.017, 0.020, 0.022);
          vec3 silverEdge = vec3(0.76, 0.80, 0.82) * rim * 0.9;
          gl_FragColor = vec4(graphite + silverEdge, 1.0);
        }
      `,
    })
    const markMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .03, depthWrite: false, side: THREE.FrontSide })
    const innerMaterial = new THREE.MeshBasicMaterial({ color: 0x242b2f, side: THREE.DoubleSide, transparent: false, depthWrite: true })
    const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0xaeb9bc })
    const whole = new THREE.Group()
    const globe = new THREE.Group()
    globe.add(new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 128, 80), outerMaterial))
    globe.add(new THREE.Mesh(new THREE.SphereGeometry(RADIUS + .012, 128, 80), markMaterial))
    const left = createHalf(-Math.PI / 2, outerMaterial, markMaterial, innerMaterial, edgeMaterial)
    const right = createHalf(Math.PI / 2, outerMaterial, markMaterial, innerMaterial, edgeMaterial)
    if (!rimRenderer) {
      left.children.at(-1).layers.set(0)
      right.children.at(-1).layers.set(0)
    }
    left.visible = false
    right.visible = false
    whole.add(globe, left, right)
    scene.add(whole)

    let openDistance = 1.75
    let panelRevealFactor = 1.4
    let sceneOffsetY = 0
    const resize = () => {
      if (!host.isConnected || !host.parentElement) return
      const width = Math.max(host.clientWidth, 1)
      const height = Math.max(host.clientHeight, 1)
      const sceneRect = host.parentElement.getBoundingClientRect()
      const viewHeight = 2 * (7.8 * height / Math.max(sceneRect.height, 1)) * Math.tan(THREE.MathUtils.degToRad(35 / 2))
      camera.left = -viewHeight * width / height / 2
      camera.right = -camera.left
      camera.top = viewHeight / 2
      camera.bottom = -camera.top
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      if (rimRenderer) {
        rimCamera.position.copy(camera.position)
        rimCamera.left = camera.left
        rimCamera.right = camera.right
        rimCamera.top = camera.top
        rimCamera.bottom = camera.bottom
        rimCamera.updateProjectionMatrix()
        rimRenderer.setSize(width, height, false)
      }
      const codeWidth = host.parentElement.querySelector('.code-window')?.offsetWidth || 650
      const pixelsPerWorldUnit = height / viewHeight
      const extraSideGap = Math.min(30, codeWidth * .05)
      openDistance = 1.3 * (codeWidth / 2 + extraSideGap) / (pixelsPerWorldUnit * 1.16)
      panelRevealFactor = 1.3 * (1 + 2 * extraSideGap / codeWidth)
      sceneOffsetY = (height / 2 - (sceneRect.top + sceneRect.height / 2)) / pixelsPerWorldUnit
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    let frame = 0
    let revealed = false
    let completed = false
    const panel = panelRef.current
    const borderFrame = frameRef.current
    const start = performance.now()
    const tick = now => {
      const seconds = (now - start) / 1000
      whole.scale.setScalar(1.16)
      whole.position.y = sceneOffsetY
      if (seconds < SPIN_END) {
        const p = clamp(seconds / SPIN_END)
        whole.rotation.set(.13 * Math.sin(p * Math.PI), Math.PI * 2 * spinProgress(p), .035 * Math.sin(p * Math.PI * 2))
      } else {
        whole.rotation.set(0, Math.PI * 2, 0)
        if (!revealed) {
          revealed = true
          globe.visible = false
          left.visible = true
          right.visible = true
          left.userData.innerFace.visible = true
          right.userData.innerFace.visible = true
          if (panel) panel.style.transition = 'none'
          callbacks.current.onReveal()
        }
        const opening = openingProgress(clamp((seconds - SPIN_END) / OPEN_DURATION))
        left.position.x = -openDistance * opening
        right.position.x = openDistance * opening
        if (panel) {
          const panelOpening = Math.min(1, opening * panelRevealFactor)
          const sideInset = 50 * (1 - panelOpening)
          panel.style.opacity = opening > 0 ? '1' : '0'
          panel.style.transform = 'none'
          panel.style.clipPath = `inset(0 ${sideInset}% 0 ${sideInset}%)`
          if (borderFrame) {
            borderFrame.style.opacity = opening > 0 ? '1' : '0'
            borderFrame.style.clipPath = `inset(0 ${sideInset}% 0 ${sideInset}%)`
          }
        }
        if (seconds > FALL_START) {
          const t = (seconds - FALL_START) * FALL_SPEED
          const outwardVelocity = openDistance * .25 / OPEN_DURATION
          const outwardCarry = outwardVelocity * (1 - Math.exp(-7 * t)) / (7 * FALL_SPEED)
          left.position.set(-openDistance - outwardCarry, -4 * t - 18 * t * t, -.14 * t)
          right.position.set(openDistance + outwardCarry, -3.8 * t - 18.5 * t * t, -.17 * t)
          left.rotation.set(-.15 * t, -.6 * t, -.38 * t * t)
          right.rotation.set(.12 * t, .6 * t, .34 * t * t)
        }
      }
      renderer.render(scene, camera)
      if (rimRenderer) rimRenderer.render(scene, rimCamera)
      if (seconds < END) frame = requestAnimationFrame(tick)
      else if (!completed) { completed = true; callbacks.current.onDone() }
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      scene.traverse(object => { if (object.geometry) object.geometry.dispose() })
      outerMaterial.dispose(); markMaterial.dispose(); innerMaterial.dispose(); edgeMaterial.dispose(); texture.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      rimRenderer?.dispose()
      rimRenderer?.domElement.remove()
      if (panel) {
        if (completed) {
          panel.style.transition = 'none'
          panel.style.opacity = '1'
          panel.style.transform = 'none'
          panel.style.clipPath = 'inset(0 0% 0 0%)'
        } else {
          panel.style.transition = ''
          panel.style.opacity = ''
          panel.style.transform = ''
          panel.style.clipPath = ''
        }
      }
      if (borderFrame) {
        borderFrame.style.opacity = completed ? '1' : ''
        borderFrame.style.clipPath = completed ? 'inset(0 0% 0 0%)' : ''
      }
    }
  }, [])

  return <><div className="three-sphere" ref={mount} aria-hidden="true" /><div className="three-rim" ref={rimMount} aria-hidden="true" /></>
}

