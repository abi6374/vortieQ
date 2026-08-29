import React, { useEffect, useRef } from 'react'

/**
 * LiquidMetalBackground (React Bits - Molten Metal)
 * High-performance WebGL procedural liquid shader with cursor wave physics,
 * specular chrome highlights, and dual-theme adaptation.
 */
export default function LiquidMetalBackground({ className = '', isDark = false }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) {
      // Fallback to Canvas 2D procedural rendering if WebGL is unavailable
      const ctx = canvas.getContext('2d')
      let animId
      let t = 0
      const render2d = () => {
        t += 0.015
        const w = canvas.width
        const h = canvas.height
        const grad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w)
        if (isDark) {
          grad.addColorStop(0, '#0F172A')
          grad.addColorStop(0.5, '#0B0F19')
          grad.addColorStop(1, '#05070B')
        } else {
          grad.addColorStop(0, '#EEF4FD')
          grad.addColorStop(0.6, '#E1ECFA')
          grad.addColorStop(1, '#D5E4F7')
        }
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
        animId = requestAnimationFrame(render2d)
      }
      render2d()
      return () => cancelAnimationFrame(animId)
    }

    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = (a_position + 1.0) * 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `

    const fsSource = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_time;
      uniform float u_isDark;
      varying vec2 v_uv;

      // Simplex noise / procedural flow function
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m;
        m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main() {
        vec2 st = gl_FragCoord.xy / u_resolution.xy;
        st.x *= u_resolution.x / u_resolution.y;

        vec2 mouseNorm = u_mouse / u_resolution;
        mouseNorm.x *= u_resolution.x / u_resolution.y;

        float distToMouse = length(st - mouseNorm);
        float mouseWave = sin(distToMouse * 14.0 - u_time * 3.5) * exp(-distToMouse * 2.8) * 0.12;

        // Molten fluid wave layers
        vec2 pos = st * 1.8;
        float n1 = snoise(pos + vec2(u_time * 0.08, u_time * 0.05) + mouseWave);
        float n2 = snoise(pos * 2.2 - vec2(u_time * 0.06, -u_time * 0.07) + vec2(n1 * 0.6));
        float n3 = snoise(pos * 3.5 + vec2(n2 * 0.8, u_time * 0.09));

        // Normal map calculation for metallic specular reflections
        float height = n1 * 0.5 + n2 * 0.3 + n3 * 0.2 + mouseWave;
        vec3 normal = normalize(vec3(-dFdx(height) * 3.0, -dFdy(height) * 3.0, 1.0));

        // Specular highlight from directional light
        vec3 lightDir = normalize(vec3(0.5, 0.8, 1.2));
        vec3 viewDir = vec3(0.0, 0.0, 1.0);
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);
        float diff = max(dot(normal, lightDir), 0.0);

        // Color palettes (Dark Molten Chrome vs Light Platinum Liquid)
        vec3 darkBase = vec3(0.04, 0.06, 0.09);
        vec3 darkMetal = vec3(0.08, 0.14, 0.24);
        vec3 darkCyan = vec3(0.0, 0.55, 0.95);
        vec3 darkHighlight = vec3(0.85, 0.95, 1.0);

        vec3 lightBase = vec3(0.95, 0.97, 0.99);
        vec3 lightMetal = vec3(0.88, 0.93, 0.98);
        vec3 lightBlue = vec3(0.0, 0.45, 0.88);
        vec3 lightHighlight = vec3(1.0, 1.0, 1.0);

        vec3 finalColor;
        if (u_isDark > 0.5) {
          vec3 layer = mix(darkBase, darkMetal, height * 0.5 + 0.5);
          layer += darkCyan * pow(diff, 3.0) * 0.5;
          layer += darkHighlight * spec * 0.9;
          finalColor = layer;
        } else {
          vec3 layer = mix(lightBase, lightMetal, height * 0.5 + 0.5);
          layer = mix(layer, lightBlue, pow(1.0 - diff, 4.0) * 0.12);
          layer += lightHighlight * spec * 0.85;
          finalColor = layer;
        }

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `

    function createShader(gl, type, source) {
      const shader = gl.createShader(type)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn(gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    // Try compiling with dFdx extension (OES_standard_derivatives) for WebGL1
    gl.getExtension('OES_standard_derivatives')
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource)
    
    // WebGL fallback if extensions fail: simple smooth liquid shader
    let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, '#extension GL_OES_standard_derivatives : enable\n' + fsSource)
    if (!fragmentShader) {
      // Fallback simple shader without derivative functions
      const fallbackFs = `
        precision mediump float;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        uniform float u_time;
        uniform float u_isDark;
        void main() {
          vec2 st = gl_FragCoord.xy / u_resolution.xy;
          float wave = sin(st.x * 6.0 + u_time * 0.8) * cos(st.y * 6.0 + u_time * 0.6) * 0.5 + 0.5;
          float mDist = length((gl_FragCoord.xy - u_mouse) / u_resolution.y);
          float mWave = sin(mDist * 16.0 - u_time * 3.0) * exp(-mDist * 3.0) * 0.2;
          float total = clamp(wave + mWave, 0.0, 1.0);
          
          if (u_isDark > 0.5) {
            vec3 c1 = vec3(0.04, 0.06, 0.10);
            vec3 c2 = vec3(0.00, 0.40, 0.80);
            gl_FragColor = vec4(mix(c1, c2, total * 0.35), 1.0);
          } else {
            vec3 c1 = vec3(0.96, 0.98, 1.0);
            vec3 c2 = vec3(0.85, 0.92, 0.99);
            gl_FragColor = vec4(mix(c1, c2, total * 0.5), 1.0);
          }
        }
      `
      fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fallbackFs)
    }

    if (!vertexShader || !fragmentShader) return

    const program = gl.createProgram()
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn(gl.getProgramInfoLog(program))
      return
    }

    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
      ]),
      gl.STATIC_DRAW
    )

    const posAttr = gl.getAttribLocation(program, 'a_position')
    const resUniform = gl.getUniformLocation(program, 'u_resolution')
    const mouseUniform = gl.getUniformLocation(program, 'u_mouse')
    const timeUniform = gl.getUniformLocation(program, 'u_time')
    const isDarkUniform = gl.getUniformLocation(program, 'u_isDark')

    let isVisible = true
    let isTabActive = true
    let observer = null

    const handleVisibilityChange = () => {
      isTabActive = !document.hidden
      if (isTabActive && isVisible && !animFrame) {
        animFrame = requestAnimationFrame(render)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    if (window.IntersectionObserver) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            isVisible = entry.isIntersecting
            if (isVisible && isTabActive && !animFrame) {
              animFrame = requestAnimationFrame(render)
            }
          })
        },
        { threshold: 0.02 }
      )
      observer.observe(canvas)
    }

    const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
    let mouseX = (canvas.clientWidth || window.innerWidth) * 0.5
    let mouseY = (canvas.clientHeight || window.innerHeight) * 0.5
    let targetMouseX = mouseX
    let targetMouseY = mouseY

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      targetMouseX = e.clientX - rect.left
      targetMouseY = canvas.clientHeight - (e.clientY - rect.top)
    }

    if (!isTouch) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true })
    }

    const handleResize = () => {
      // Smart resolution scaler: Render at 0.5x on mobile / 0.6x on desktop
      // Drastically lowers GPU fragment shader math while maintaining smooth fluid look
      const isMobile = window.innerWidth < 768
      const dpr = isMobile ? 0.45 : 0.6
      canvas.width = Math.max(120, Math.round((canvas.clientWidth || window.innerWidth) * dpr))
      canvas.height = Math.max(120, Math.round((canvas.clientHeight || window.innerHeight) * dpr))
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    handleResize()
    window.addEventListener('resize', handleResize, { passive: true })

    let startTime = performance.now()
    let lastRenderTime = 0
    let animFrame = null
    const targetFps = isTouch ? 30 : 60
    const frameInterval = 1000 / targetFps

    const render = (time) => {
      if (!isVisible || !isTabActive) {
        animFrame = null
        return
      }

      // Throttle frames on low power/mobile to prevent battery drain & jank
      const delta = time - lastRenderTime
      if (delta < frameInterval - 1) {
        animFrame = requestAnimationFrame(render)
        return
      }
      lastRenderTime = time

      // Damping mouse physics
      mouseX += (targetMouseX - mouseX) * 0.08
      mouseY += (targetMouseY - mouseY) * 0.08

      const elapsed = (time - startTime) * 0.0008

      gl.useProgram(program)
      gl.enableVertexAttribArray(posAttr)
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
      gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0)

      gl.uniform2f(resUniform, canvas.width, canvas.height)
      gl.uniform2f(mouseUniform, (mouseX / (canvas.clientWidth || 1)) * canvas.width, (mouseY / (canvas.clientHeight || 1)) * canvas.height)
      gl.uniform1f(timeUniform, elapsed)
      gl.uniform1f(isDarkUniform, isDark ? 1.0 : 0.0)

      gl.drawArrays(gl.TRIANGLES, 0, 6)

      animFrame = requestAnimationFrame(render)
    }

    animFrame = requestAnimationFrame(render)

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame)
      if (observer) observer.disconnect()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (!isTouch) {
        window.removeEventListener('mousemove', handleMouseMove)
      }
      window.removeEventListener('resize', handleResize)
      if (gl) {
        gl.deleteProgram(program)
        gl.deleteShader(vertexShader)
        gl.deleteShader(fragmentShader)
        gl.deleteBuffer(positionBuffer)
      }
    }
  }, [isDark])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{
        opacity: isDark ? 0.85 : 0.7,
        transform: 'translate3d(0, 0, 0)',
        willChange: 'transform',
      }}
    />
  )
}
