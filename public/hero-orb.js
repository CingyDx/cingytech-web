(() => {
  const art = document.querySelector('.hero-art');
  const canvas = art?.querySelector('.hero-orb-canvas');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!art || !canvas || reducedMotion.matches) return;

  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: false,
    powerPreference: 'low-power'
  });
  if (!gl) return;

  const vertexSource = `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `;

  // Each pixel casts a ray through three rotating torus surfaces and a lit core.
  const fragmentSource = `
    precision highp float;
    uniform vec2 resolution;
    uniform float time;

    mat2 rotate(float a) {
      float c = cos(a), s = sin(a);
      return mat2(c, -s, s, c);
    }

    float torus(vec3 p, float radius, float thickness) {
      return length(vec2(length(p.xz) - radius, p.y)) - thickness;
    }

    vec2 scene(vec3 p) {
      vec3 a = p;
      a.xy = rotate(0.37 + time * 0.22) * a.xy;
      a.yz = rotate(0.28 + time * 0.17) * a.yz;
      float outer = torus(a, 1.03, 0.028);

      vec3 b = p;
      b.xz = rotate(-0.65 + time * 0.28) * b.xz;
      b.xy = rotate(0.95) * b.xy;
      float middle = torus(b, 0.78, 0.027);

      vec3 c = p;
      c.yz = rotate(1.1 - time * 0.31) * c.yz;
      c.xz = rotate(0.4) * c.xz;
      float inner = torus(c, 0.53, 0.023);

      float core = length(p) - 0.19;
      vec2 hit = vec2(outer, 1.0);
      if (middle < hit.x) hit = vec2(middle, 2.0);
      if (inner < hit.x) hit = vec2(inner, 3.0);
      if (core < hit.x) hit = vec2(core, 4.0);
      return hit;
    }

    vec3 normalAt(vec3 p) {
      const float e = 0.004;
      return normalize(vec3(
        scene(p + vec3(e, 0.0, 0.0)).x - scene(p - vec3(e, 0.0, 0.0)).x,
        scene(p + vec3(0.0, e, 0.0)).x - scene(p - vec3(0.0, e, 0.0)).x,
        scene(p + vec3(0.0, 0.0, e)).x - scene(p - vec3(0.0, 0.0, e)).x
      ));
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - resolution * 0.5) / min(resolution.x, resolution.y);
      vec3 ro = vec3(0.0, 0.0, 3.3);
      vec3 rd = normalize(vec3(uv * 2.45, -3.3));
      float distanceTravelled = 0.0;
      float closest = 10.0;
      float material = 0.0;

      for (int i = 0; i < 72; i++) {
        vec2 samplePoint = scene(ro + rd * distanceTravelled);
        closest = min(closest, samplePoint.x);
        if (samplePoint.x < 0.004) {
          material = samplePoint.y;
          break;
        }
        distanceTravelled += max(samplePoint.x * 0.8, 0.008);
        if (distanceTravelled > 6.2) break;
      }

      float halo = exp(-7.0 * max(closest, 0.0));
      float radial = exp(-4.8 * dot(uv, uv));
      vec3 color = vec3(0.30, 0.17, 0.60) * halo * 0.22
                 + vec3(0.14, 0.09, 0.30) * radial * 0.20;
      float alpha = min(0.28, halo * 0.18 + radial * 0.06);

      if (material > 0.5) {
        vec3 point = ro + rd * distanceTravelled;
        vec3 normal = normalAt(point);
        vec3 key = normalize(vec3(-0.55, 0.78, 1.1));
        vec3 fill = normalize(vec3(0.8, -0.4, 0.75));
        float diffuse = max(dot(normal, key), 0.0);
        float rim = pow(1.0 - max(dot(normal, -rd), 0.0), 2.3);
        float specular = pow(max(dot(reflect(-key, normal), -rd), 0.0), 48.0);
        float secondSpecular = pow(max(dot(reflect(-fill, normal), -rd), 0.0), 24.0);
        vec3 glass = vec3(0.19, 0.12, 0.43) * (0.36 + diffuse * 0.65)
                   + vec3(0.58, 0.46, 1.0) * (rim * 1.1 + secondSpecular * 0.24)
                   + vec3(0.95, 0.92, 1.0) * specular * 1.5;
        if (material > 3.5) {
          glass = vec3(0.48, 0.27, 1.0) * (0.9 + diffuse)
                + vec3(1.0, 0.91, 1.0) * (specular * 1.8 + rim * 0.7);
        }
        color += glass;
        alpha = material > 3.5 ? 0.97 : 0.9;
      }

      gl_FragColor = vec4(min(color, vec3(1.0)), alpha);
    }
  `;

  function makeShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertex = makeShader(gl.VERTEX_SHADER, vertexSource);
  const fragment = makeShader(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return;
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

  const vertices = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.useProgram(program);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const resolution = gl.getUniformLocation(program, 'resolution');
  const time = gl.getUniformLocation(program, 'time');
  let visible = true;
  let frameId = 0;
  let lastFrame = 0;
  const started = performance.now();

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const maxSize = window.innerWidth < 760 ? 360 : 640;
    const scale = Math.min(window.devicePixelRatio || 1, 1.4, maxSize / Math.max(bounds.width, bounds.height));
    const width = Math.max(1, Math.round(bounds.width * scale));
    const height = Math.max(1, Math.round(bounds.height * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  function draw(now) {
    if (!visible || document.hidden || reducedMotion.matches) {
      frameId = 0;
      return;
    }
    frameId = requestAnimationFrame(draw);
    if (now - lastFrame < (window.innerWidth < 760 ? 50 : 34)) return;
    lastFrame = now;
    resize();
    gl.uniform2f(resolution, canvas.width, canvas.height);
    gl.uniform1f(time, (now - started) * 0.001);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    art.classList.add('orb-ready');
  }

  function resume() {
    if (!frameId && visible && !document.hidden && !reducedMotion.matches) {
      frameId = requestAnimationFrame(draw);
    }
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) resume();
    }, { threshold: 0 });
    observer.observe(art);
  }
  document.addEventListener('visibilitychange', resume);
  reducedMotion.addEventListener?.('change', () => {
    if (reducedMotion.matches) art.classList.remove('orb-ready');
    else resume();
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    visible = false;
    art.classList.remove('orb-ready');
  });
  resume();
})();
