document.addEventListener('DOMContentLoaded', () => {

  // --- Estado da Aplicação ---
  const defaultState = {
    brightness: 100,  // 20% a 200%
    saturation: 100,  // 0% a 250%
    rotation: 0,      // 0, 90, 180, 270 graus
    zoom: 1.0,        // 0.5x a 2.5x
    zoomOriginX: 0.5, // 0.0 (esquerda) a 1.0 (direita)
    zoomOriginY: 0.5, // 0.0 (topo) a 1.0 (base)
    flipH: false,     // boolean
    activeTool: null, // 'crop' | 'text' | 'draw' | null
    cropRect: null,   // {x, y, w, h} em px de imagem ou null
    pendingCrop: null,
    textItems: [],    // {x, y, text, color, size}
    drawings: []      // {color, size, points: [{x,y}, ...]}
  };

  const brightnessPresets = [60, 100, 150, 200];
  const drawPresets = [
    { color: '#ff0000', size: 8 },
    { color: '#ff0000', size: 20 }
  ];
  const textPresets = [
    { color: '#ff0000', size: 28 },
    { color: '#ff0000', size: 52 }
  ];
  let drawPresetIndex = 0;
  let textPresetIndex = 0;
  let state = { ...defaultState, textItems: [], drawings: [] };

  // --- Elementos do DOM ---
  const canvas = document.getElementById('mainCanvas');
  const ctx = canvas.getContext('2d');
  const imageFrame = document.getElementById('imageFrame');
  const fileInput = document.getElementById('fileInput');
  const uploadButton = document.getElementById('uploadButton');
  const downloadButton = document.getElementById('downloadButton');
  const focalRing = document.getElementById('focalRing');

  // Controles Abstratos (Cluster Esquerdo: Luminosidade, Cor, Restauração)
  const ctrlLuminosity = document.getElementById('ctrlLuminosity');
  const lumGlowArc = document.getElementById('lumGlowArc');
  const lumHandle = document.getElementById('lumHandle');

  const ctrlChroma = document.getElementById('ctrlChroma');
  const chromaBlobPath = document.getElementById('chromaBlobPath');

  const ctrlReset = document.getElementById('ctrlReset');

  // Controles Abstratos (Cluster Direito: Rotação, Zoom, Espelhamento)
  const ctrlRotation = document.getElementById('ctrlRotation');
  const ctrlZoom = document.getElementById('ctrlZoom');
  const ctrlReflect = document.getElementById('ctrlReflect');

  // Ferramentas Criativas (Cluster Inferior: Recorte, Texto, Desenho)
  const ctrlCrop = document.getElementById('ctrlCrop');
  const ctrlText = document.getElementById('ctrlText');
  const ctrlDraw = document.getElementById('ctrlDraw');
  const textEditor = document.getElementById('textEditor');

  // Matrizes de transformação p/ conversão entre coordenadas de tela e de imagem
  let imageMatrixForward = null;
  let inverseImageMatrix = null;

  // Estado local das interações de desenho/recorte
  let drawStroke = null;
  let cropDragStart = null;
  let isToolDrag = false;
  let editingTextIndex = -1;

  // --- Carregamento da Imagem ---
  const imageObj = new Image();
  imageObj.crossOrigin = 'anonymous';
  let originalImageSrc = null;
  let originalCanvasWidth = 0;
  let originalCanvasHeight = 0;
  let isApplyingCrop = false;

  function setCanvasSizeFromImage() {
    const maxDim = 1200;
    let w = imageObj.naturalWidth || 800;
    let h = imageObj.naturalHeight || 800;

    if (w > maxDim || h > maxDim) {
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    canvas.width = w;
    canvas.height = h;
  }

  function getImageDrawDimensions() {
    const isQuarterTurn = state.rotation % 180 !== 0;
    return {
      width: isQuarterTurn ? canvas.height : canvas.width,
      height: isQuarterTurn ? canvas.width : canvas.height
    };
  }

  imageObj.onload = () => {
    setCanvasSizeFromImage();
    if (!isApplyingCrop) {
      originalCanvasWidth = canvas.width;
      originalCanvasHeight = canvas.height;
    }
    isApplyingCrop = false;

    renderCanvas();
  };

  // ==========================================================================
  // CANVAS RENDERING PIPELINE COM ZOOM SELETIVO (FOCAL POINT)
  // ==========================================================================
  function renderCanvas() {
    if (!imageObj.complete || imageObj.naturalWidth === 0) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Mover origem para o centro do canvas
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    ctx.translate(centerX, centerY);

    // 1. Aplicar Rotação
    ctx.rotate((state.rotation * Math.PI) / 180);

    // 2. Aplicar Zoom Seletivo baseado no Ponto Focal (zoomOriginX, zoomOriginY)
    if (state.zoom !== 1.0) {
      const offsetX = (state.zoomOriginX - 0.5) * canvas.width;
      const offsetY = (state.zoomOriginY - 0.5) * canvas.height;
      ctx.translate(-offsetX * (state.zoom - 1), -offsetY * (state.zoom - 1));
    }

    // 3. Aplicar Escala / Zoom
    ctx.scale(state.zoom, state.zoom);

    // 4. Aplicar Espelhamento Horizontal
    ctx.scale(state.flipH ? -1 : 1, 1);

    // 5. Aplicar Filtros CSS de Luminosidade e Saturação
    ctx.filter = `brightness(${state.brightness}%) saturate(${state.saturation}%)`;

    // Desenhar a imagem centralizada
    const { width: drawW, height: drawH } = getImageDrawDimensions();
    ctx.drawImage(imageObj, -drawW / 2, -drawH / 2, drawW, drawH);

    // Capturar matrizes de transformação (tela <-> imagem)
    const fwd = ctx.getTransform();
    imageMatrixForward = new DOMMatrix(fwd);
    inverseImageMatrix = fwd.invertSelf();

    // Texto e desenhos ficam nítidos (sem os filtros de cor/luz da imagem)
    ctx.filter = 'none';

    // 6. Traços desenhados
    if (state.drawings.length > 0) {
      drawAllDrawings();
    }

    // 7. Textos inseridos
    if (state.textItems.length > 0) {
      drawAllTextItems();
    }

    ctx.restore();

    // O preview usa coordenadas da tela e, por isso, deve ficar fora da
    // transformação aplicada à imagem.
    const pendingCrop = state.pendingCrop;
    if (pendingCrop && pendingCrop.w > 0 && pendingCrop.h > 0) {
      drawCropPreview(pendingCrop);
    }

    // Atualizar feedback visual dos controles
    updateControlsUI();
  }

  function drawCropPreview(rect) {
    const w = canvas.width;
    const h = canvas.height;
    const x = Math.max(0, Math.min(w, rect.x));
    const y = Math.max(0, Math.min(h, rect.y));
    const cw = Math.max(0, Math.min(w - x, rect.w));
    const ch = Math.max(0, Math.min(h - y, rect.h));
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, w, y);
    ctx.fillRect(0, y + ch, w, h - (y + ch));
    ctx.fillRect(0, y, x, ch);
    ctx.fillRect(x + cw, y, w - (x + cw), ch);

    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(x, y, cw, ch);
    ctx.restore();
  }

  function drawAllDrawings(renderCtx = ctx) {
    renderCtx.save();
    renderCtx.lineCap = 'round';
    renderCtx.lineJoin = 'round';
    for (const stroke of state.drawings) {
      if (stroke.points.length < 2) continue;
      renderCtx.strokeStyle = stroke.color;
      renderCtx.lineWidth = stroke.size;
      renderCtx.beginPath();
      renderCtx.moveTo(stroke.points[0].x - canvas.width / 2, stroke.points[0].y - canvas.height / 2);
      for (let i = 1; i < stroke.points.length; i++) {
        renderCtx.lineTo(stroke.points[i].x - canvas.width / 2, stroke.points[i].y - canvas.height / 2);
      }
      renderCtx.stroke();
    }
    renderCtx.restore();
  }

  function drawAllTextItems(renderCtx = ctx) {
    renderCtx.save();
    renderCtx.textBaseline = 'top';
    for (const item of state.textItems) {
      renderCtx.font = `${item.size}px system-ui, sans-serif`;
      renderCtx.fillStyle = item.color;
      renderCtx.fillText(item.text, item.x - canvas.width / 2, item.y - canvas.height / 2);
    }
    renderCtx.restore();
  }

  // Converte coordenadas de tela (clientX/clientY) em coordenadas de imagem
  function screenToImage(clientX, clientY) {
    const cRect = canvas.getBoundingClientRect();
    const px = (clientX - cRect.left) * (canvas.width / cRect.width);
    const py = (clientY - cRect.top) * (canvas.height / cRect.height);
    if (!inverseImageMatrix) return { x: 0, y: 0 };
    const pt = inverseImageMatrix.transformPoint(new DOMPoint(px, py));
    return {
      x: pt.x + canvas.width / 2,
      y: pt.y + canvas.height / 2
    };
  }

  function screenToCanvas(clientX, clientY) {
    const cRect = canvas.getBoundingClientRect();
    return {
      x: (clientX - cRect.left) * (canvas.width / cRect.width),
      y: (clientY - cRect.top) * (canvas.height / cRect.height)
    };
  }

  // Converte coordenadas de imagem em posição de tela (para o editor de texto)
  function imageToScreen(ix, iy) {
    const cRect = canvas.getBoundingClientRect();
    if (!imageMatrixForward) {
      return { x: cRect.left, y: cRect.top };
    }
    const q = imageMatrixForward.transformPoint(new DOMPoint(ix - canvas.width / 2, iy - canvas.height / 2));
    return {
      x: cRect.left + q.x * (cRect.width / canvas.width),
      y: cRect.top + q.y * (cRect.height / canvas.height)
    };
  }

  // O botão de download só aparece quando a imagem recebeu alguma edição
  function hasEdits() {
    return state.brightness !== 100 ||
      state.saturation !== 100 ||
      state.rotation !== 0 ||
      state.zoom !== 1.0 ||
      state.zoomOriginX !== 0.5 ||
      state.zoomOriginY !== 0.5 ||
      state.flipH ||
      state.textItems.length > 0 ||
      state.drawings.length > 0 ||
      state.pendingCrop !== null ||
      canvas.width !== originalCanvasWidth ||
      canvas.height !== originalCanvasHeight;
  }

  function syncDownloadVisibility() {
    if (downloadButton) {
      downloadButton.classList.toggle('is-hidden', !hasEdits());
    }
  }

  // ==========================================================================
  // ATUALIZAÇÃO DO FEEDBACK VISUAL DOS CONTROLES
  // ==========================================================================
  function updateControlsUI() {
    // 1. Luminosidade (Atualizar arco e posição da esfera no handle)
    const lumPercent = (state.brightness - 20) / (200 - 20); // 0 a 1
    const maxOffset = 180;
    const strokeOffset = maxOffset - (lumPercent * 120);
    if (lumGlowArc) {
      lumGlowArc.style.strokeDashoffset = strokeOffset;
    }
    const angle = (lumPercent * Math.PI) - (Math.PI / 2);
    const handleX = Math.round(Math.cos(angle) * 38);
    const handleY = Math.round(Math.sin(angle) * 38);
    if (lumHandle) {
      lumHandle.style.transform = `translate(${handleX}px, ${handleY}px)`;
    }

    const glowStrength = (0.35 + (state.brightness / 200) * 0.9).toFixed(2);
    ctrlLuminosity.style.setProperty('--lum-glow-strength', glowStrength);
    ctrlLuminosity.setAttribute('aria-valuenow', Math.round(state.brightness));

    // 2. Cor / Saturação (Atualizar filtro e opacidade da Mancha Cromática)
    const satRatio = state.saturation / 100;
    if (chromaBlobPath) {
      chromaBlobPath.style.filter = `saturate(${satRatio}) brightness(${0.7 + satRatio * 0.4})`;
      chromaBlobPath.style.opacity = Math.max(0.3, Math.min(1, satRatio * 0.6 + 0.3));
      chromaBlobPath.style.transform = `scale(${0.9 + Math.min(0.25, satRatio * 0.15)})`;
    }
    ctrlChroma.setAttribute('aria-valuenow', Math.round(state.saturation));

    // 3. Zoom
    ctrlZoom.setAttribute('aria-valuenow', Math.round(state.zoom * 100));

    // 4. Espelhamento (Atualizar cores das metades)
    const leftHalf = document.getElementById('reflectLeft');
    const rightHalf = document.getElementById('reflectRight');
    if (leftHalf && rightHalf) {
      if (state.flipH) {
        leftHalf.style.fill = 'var(--accent-violet)';
        rightHalf.style.fill = 'rgba(255, 255, 255, 0.85)';
      } else {
        leftHalf.style.fill = 'rgba(255, 255, 255, 0.85)';
        rightHalf.style.fill = 'var(--accent-violet)';
      }
    }

    // 5. Rotação
    const svgRot = ctrlRotation.querySelector('.rotation-img');
    if (svgRot) {
      svgRot.style.transform = `rotate(${state.rotation}deg)`;
    }

    // 6. Ferramentas Criativas (estado ativo)
    ctrlCrop.classList.toggle('active', state.activeTool === 'crop');
    ctrlText.classList.toggle('active', state.activeTool === 'text');
    ctrlDraw.classList.toggle('active', state.activeTool === 'draw');
    ctrlCrop.setAttribute('aria-pressed', state.activeTool === 'crop' ? 'true' : 'false');
    ctrlText.setAttribute('aria-pressed', state.activeTool === 'text' ? 'true' : 'false');
    ctrlDraw.setAttribute('aria-pressed', state.activeTool === 'draw' ? 'true' : 'false');

    // Indicar a cor do preset atual de desenho na pena
    const drawSvg = ctrlDraw.querySelector('.tool-svg');
    if (drawSvg) {
      drawSvg.style.stroke = state.activeTool === 'draw' ? drawPresets[drawPresetIndex].color : '';
    }

    // Cursor contextual da moldura conforme ferramenta ativa
    if (state.activeTool === 'crop') imageFrame.style.cursor = 'crosshair';
    else if (state.activeTool === 'draw') imageFrame.style.cursor = 'crosshair';
    else if (state.activeTool === 'text') imageFrame.style.cursor = 'text';
    else imageFrame.style.cursor = '';

    // Exibir o download apenas quando a imagem foi editada
    syncDownloadVisibility();
  }

  // ==========================================================================
  // INTERAÇÕES DOS CONTROLES ABSTRATOS
  // ==========================================================================

  // --- 1. CONTROLE DE LUMINOSIDADE (Clique em opções previsíveis) ---
  function cycleBrightnessPreset() {
    const currentIndex = brightnessPresets.indexOf(state.brightness);
    const nextIndex = currentIndex === -1 ? 1 : (currentIndex + 1) % brightnessPresets.length;
    state.brightness = brightnessPresets[nextIndex];
    updateControlsUI();
    if (imageObj.complete && imageObj.naturalWidth > 0) {
      renderCanvas();
    }
  }

  ctrlLuminosity.addEventListener('click', () => {
    cycleBrightnessPreset();
  });

  ctrlLuminosity.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      cycleBrightnessPreset();
    }
  });

  // --- 2. CONTROLE DE COR / SATURAÇÃO (Arrastar Contínuo Fluido) ---
  let isDraggingChroma = false;
  let startYChroma = 0;
  let startSatVal = 100;

  function handleChromaMove(clientY) {
    const deltaY = startYChroma - clientY; // Mover para cima aumenta a cor, para baixo diminui
    const sensitivity = 1.8;
    const newSat = Math.max(0, Math.min(250, startSatVal + deltaY * sensitivity));
    state.saturation = Math.round(newSat);
    renderCanvas();
  }

  ctrlChroma.addEventListener('pointerdown', (e) => {
    isDraggingChroma = true;
    startYChroma = e.clientY;
    startSatVal = state.saturation;
    ctrlChroma.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  ctrlChroma.addEventListener('pointermove', (e) => {
    if (isDraggingChroma) {
      handleChromaMove(e.clientY);
    }
  });

  ctrlChroma.addEventListener('pointerup', () => {
    isDraggingChroma = false;
  });

  ctrlChroma.addEventListener('click', (e) => {
    // Se foi apenas um clique rápido sem arraste significativo, alterna níveis pré-definidos
    if (Math.abs(startYChroma - e.clientY) < 4) {
      if (state.saturation === 100) state.saturation = 200;
      else if (state.saturation === 200) state.saturation = 0;
      else state.saturation = 100;
      renderCanvas();
    }
  });

  ctrlChroma.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      state.saturation = Math.min(250, state.saturation + 15);
      renderCanvas();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      state.saturation = Math.max(0, state.saturation - 15);
      renderCanvas();
    }
  });

  // --- 3. CONTROLE DE RESTAURAÇÃO / RESET ---
  function triggerReset() {
    state = { ...defaultState, textItems: [], drawings: [] };
    drawStroke = null;
    cropDragStart = null;
    isToolDrag = false;
    state.cropRect = null;
    state.pendingCrop = null;
    if (editingTextIndex !== -1) {
      editingTextIndex = -1;
      textEditor.classList.remove('visible');
      textEditor.value = '';
    }
    hideFocalRing();
    if (originalImageSrc && imageObj.src !== originalImageSrc) {
      imageObj.src = originalImageSrc;
    } else {
      setCanvasSizeFromImage();
      originalCanvasWidth = canvas.width;
      originalCanvasHeight = canvas.height;
      renderCanvas();
    }
  }

  ctrlReset.addEventListener('click', triggerReset);

  // --- 4. CONTROLE DE ROTAÇÃO (Girar 90°) ---
  function triggerRotation() {
    const previousRotation = state.rotation;
    state.rotation = (state.rotation + 90) % 360;

    if ((previousRotation % 180) !== (state.rotation % 180)) {
      [canvas.width, canvas.height] = [canvas.height, canvas.width];
    }
    renderCanvas();
  }

  ctrlRotation.addEventListener('click', triggerRotation);

  // --- 5. CONTROLE DE APROXIMAÇÃO / ZOOM ---
  function cycleZoom() {
    if (state.zoom === 1.0) state.zoom = 1.6;
    else if (state.zoom === 1.6) state.zoom = 2.2;
    else if (state.zoom === 2.2) state.zoom = 0.75;
    else state.zoom = 1.0;

    renderCanvas();
  }

  let isDraggingZoom = false;
  let startYZoom = 0;
  let startZoomVal = 1.0;

  ctrlZoom.addEventListener('pointerdown', (e) => {
    isDraggingZoom = true;
    startYZoom = e.clientY;
    startZoomVal = state.zoom;
    ctrlZoom.setPointerCapture(e.pointerId);
  });

  ctrlZoom.addEventListener('pointermove', (e) => {
    if (!isDraggingZoom) return;
    const deltaY = startYZoom - e.clientY;
    const newZoom = Math.max(0.5, Math.min(2.5, startZoomVal + deltaY * 0.012));
    state.zoom = parseFloat(newZoom.toFixed(2));
    renderCanvas();
  });

  ctrlZoom.addEventListener('pointerup', () => {
    isDraggingZoom = false;
  });

  ctrlZoom.addEventListener('click', (e) => {
    if (Math.abs(startYZoom - e.clientY) < 5) {
      cycleZoom();
    }
  });

  ctrlZoom.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      state.zoom = Math.min(2.5, parseFloat((state.zoom + 0.15).toFixed(2)));
      renderCanvas();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      state.zoom = Math.max(0.5, parseFloat((state.zoom - 0.15).toFixed(2)));
      renderCanvas();
    }
  });

  // --- 6. CONTROLE DE ESPELHAMENTO ---
  function triggerReflect() {
    state.flipH = !state.flipH;
    renderCanvas();
  }

  ctrlReflect.addEventListener('click', triggerReflect);

  // ==========================================================================
  // FERRAMENTAS CRIATIVAS — Recorte, Texto e Desenho
  // ==========================================================================

  // --- Alternância das ferramentas ---
  function setActiveTool(tool) {
    if (state.activeTool === tool) {
      state.activeTool = null;
    } else {
      state.activeTool = tool;
      closeTextEditor(true);
      if (tool !== 'crop') state.pendingCrop = null;
    }
    renderCanvas();
  }

  ctrlCrop.addEventListener('click', () => {
    if (state.activeTool === 'crop') {
      state.activeTool = null;
      state.pendingCrop = null;
    } else {
      state.activeTool = 'crop';
      state.pendingCrop = null;
    }
    renderCanvas();
  });

  ctrlText.addEventListener('click', () => {
    if (state.activeTool !== 'text') {
      setActiveTool('text');
    } else {
      textPresetIndex = (textPresetIndex + 1) % textPresets.length;
      renderCanvas();
    }
  });

  ctrlDraw.addEventListener('click', () => {
    if (state.activeTool !== 'draw') {
      setActiveTool('draw');
    } else {
      drawPresetIndex = (drawPresetIndex + 1) % drawPresets.length;
      renderCanvas();
    }
  });

  ctrlCrop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      ctrlCrop.click();
    }
  });
  ctrlText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      ctrlText.click();
    }
  });
  ctrlDraw.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      ctrlDraw.click();
    }
  });

  // --- Recorte destrutivo (aplica ao soltar o mouse) ---
  function applyCrop(rect) {
    if (!rect) return;
    const w = canvas.width;
    const h = canvas.height;
    const x = Math.max(0, Math.min(w, rect.x));
    const y = Math.max(0, Math.min(h, rect.y));
    const cw = Math.max(0, Math.min(w - x, rect.w));
    const ch = Math.max(0, Math.min(h - y, rect.h));

    state.activeTool = null;
    state.pendingCrop = null;
    state.cropRect = null;
    isToolDrag = false;
    cropDragStart = null;

    if (cw <= 2 || ch <= 2) {
      renderCanvas();
      return;
    }

    const tmp = document.createElement('canvas');
    tmp.width = Math.round(cw);
    tmp.height = Math.round(ch);
    const tmpCtx = tmp.getContext('2d');

    // Renderiza a imagem transformada em uma superfície intermediária para
    // recortar exatamente os pixels exibidos na área selecionada.
    const frame = document.createElement('canvas');
    frame.width = canvas.width;
    frame.height = canvas.height;
    const fctx = frame.getContext('2d');
    fctx.translate(frame.width / 2, frame.height / 2);
    fctx.rotate((state.rotation * Math.PI) / 180);
    if (state.zoom !== 1.0) {
      const offsetX = (state.zoomOriginX - 0.5) * frame.width;
      const offsetY = (state.zoomOriginY - 0.5) * frame.height;
      fctx.translate(-offsetX * (state.zoom - 1), -offsetY * (state.zoom - 1));
    }
    fctx.scale(state.zoom, state.zoom);
    fctx.scale(state.flipH ? -1 : 1, 1);
    fctx.filter = `brightness(${state.brightness}%) saturate(${state.saturation}%)`;
    const { width: drawW, height: drawH } = getImageDrawDimensions();
    fctx.drawImage(imageObj, -drawW / 2, -drawH / 2, drawW, drawH);
    fctx.filter = 'none';
    drawAllDrawings(fctx);
    drawAllTextItems(fctx);
    tmpCtx.drawImage(frame, x, y, cw, ch, 0, 0, tmp.width, tmp.height);

    state.rotation = 0;
    state.zoom = 1.0;
    state.zoomOriginX = 0.5;
    state.zoomOriginY = 0.5;
    state.flipH = false;
    isApplyingCrop = true;
    imageObj.src = tmp.toDataURL('image/png');
  }

  function startCropDrag(pt) {
    isToolDrag = true;
    cropDragStart = pt;
    state.pendingCrop = { x: pt.x, y: pt.y, w: 0, h: 0 };
    renderCanvas();
  }

  function updateCropDrag(pt) {
    if (!isToolDrag || !cropDragStart) return;
    const x = Math.min(cropDragStart.x, pt.x);
    const y = Math.min(cropDragStart.y, pt.y);
    const w = Math.abs(pt.x - cropDragStart.x);
    const h = Math.abs(pt.y - cropDragStart.y);
    state.pendingCrop = { x, y, w, h };
    renderCanvas();
  }

  function endCropDrag() {
    if (state.pendingCrop) {
      applyCrop(state.pendingCrop);
    } else {
      state.activeTool = null;
      isToolDrag = false;
      cropDragStart = null;
      renderCanvas();
    }
  }

  // --- Desenho livre ---
  function startStroke(pt) {
    isToolDrag = true;
    drawStroke = [pt];
    renderCanvas();
  }

  function updateStroke(pt) {
    if (!isToolDrag || !drawStroke) return;
    drawStroke.push(pt);
    renderCanvas();
  }

  function endStroke() {
    if (drawStroke && drawStroke.length > 1) {
      const preset = drawPresets[drawPresetIndex];
      state.drawings.push({
        color: preset.color,
        size: preset.size,
        points: drawStroke
      });
    }
    drawStroke = null;
    isToolDrag = false;
    renderCanvas();
  }

  // --- Inserção de texto ---
  function findTextItemAt(pt) {
    for (let i = state.textItems.length - 1; i >= 0; i--) {
      const item = state.textItems[i];
      ctx.font = `${item.size}px system-ui, sans-serif`;
      const metrics = ctx.measureText(item.text);
      const w = Math.max(metrics.width, 24);
      const h = item.size;
      if (pt.x >= item.x && pt.x <= item.x + w && pt.y >= item.y && pt.y <= item.y + h) {
        return i;
      }
    }
    return -1;
  }

  function insertTextAt(pt) {
    const preset = textPresets[textPresetIndex];
    const item = { x: pt.x, y: pt.y, text: '', color: preset.color, size: preset.size };
    state.textItems.push(item);
    renderCanvas();
    openTextEditor(state.textItems.length - 1, pt);
  }

  function openTextEditor(index, imgPt) {
    if (!textEditor) return;
    editingTextIndex = index;
    const item = state.textItems[index];
    if (item.text) textEditor.value = item.text;
    else textEditor.value = '';
    // Centraliza o editor na moldura (tela), independentemente do ponto clicado
    textEditor.style.left = '50%';
    textEditor.style.top = '50%';
    textEditor.style.transform = 'translate(-50%, -50%)';
    const pxPerImage = Math.max(1, canvas.getBoundingClientRect().width / canvas.width);
    textEditor.style.fontSize = `${Math.min(30, Math.max(14, item.size * pxPerImage))}px`;
    textEditor.style.color = item.color;
    textEditor.classList.add('visible');
    textEditor.focus();
  }

  function closeTextEditor(cancel) {
    if (!textEditor || editingTextIndex === -1) return;
    const index = editingTextIndex;
    const item = state.textItems[index];
    const value = textEditor.value.trim();
    if (cancel || value === '') {
      state.textItems.splice(index, 1);
    } else {
      item.text = value;
    }
    editingTextIndex = -1;
    textEditor.classList.remove('visible');
    textEditor.value = '';
    renderCanvas();
  }

  textEditor.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeTextEditor(true);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      closeTextEditor(false);
    }
  });

  textEditor.addEventListener('blur', () => {
    if (editingTextIndex !== -1) closeTextEditor(false);
  });

  // ==========================================================================
  // SELEÇÃO DE PONTO FOCAL DE ZOOM E PANNING NA MOLDURA DA IMAGEM
  // ==========================================================================
  let isPanningCanvas = false;
  let lastPanX = 0;
  let lastPanY = 0;

  function updateZoomFocalPoint(clientX, clientY) {
    const rect = imageFrame.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    // Converter para coordenadas normalizadas (0.0 a 1.0)
    const normX = Math.max(0.05, Math.min(0.95, relX / rect.width));
    const normY = Math.max(0.05, Math.min(0.95, relY / rect.height));

    state.zoomOriginX = parseFloat(normX.toFixed(3));
    state.zoomOriginY = parseFloat(normY.toFixed(3));

    // Exibir anel indicador de ponto focal na posição exata clicada
    showFocalRing(relX, relY);

    renderCanvas();
  }

  let focalRingTimeout = null;
  function showFocalRing(posX, posY) {
    if (!focalRing) return;
    focalRing.style.left = `${posX}px`;
    focalRing.style.top = `${posY}px`;
    focalRing.classList.add('visible');

    if (focalRingTimeout) clearTimeout(focalRingTimeout);
    focalRingTimeout = setTimeout(() => {
      focalRing.classList.remove('visible');
    }, 1200);
  }

  function hideFocalRing() {
    if (focalRing) focalRing.classList.remove('visible');
  }

  imageFrame.addEventListener('pointerdown', (e) => {
    // Ignorar se for clique duplo
    if (e.detail > 1) return;

    // Tools ativas assumem o controle da moldura
    if (state.activeTool === 'crop') {
      e.preventDefault();
      startCropDrag(screenToCanvas(e.clientX, e.clientY));
      imageFrame.setPointerCapture(e.pointerId);
      return;
    }
    const pt = screenToImage(e.clientX, e.clientY);
    if (state.activeTool === 'draw') {
      e.preventDefault();
      startStroke(pt);
      imageFrame.setPointerCapture(e.pointerId);
      return;
    }
    if (state.activeTool === 'text') {
      e.preventDefault();
      const hit = findTextItemAt(pt);
      if (hit !== -1) openTextEditor(hit, pt);
      else insertTextAt(pt);
      return;
    }

    if (state.zoom > 1.0) {
      isPanningCanvas = true;
      lastPanX = e.clientX;
      lastPanY = e.clientY;
      imageFrame.setPointerCapture(e.pointerId);
    }

    updateZoomFocalPoint(e.clientX, e.clientY);
  });

  imageFrame.addEventListener('pointermove', (e) => {
    const pt = screenToImage(e.clientX, e.clientY);

    if (state.activeTool === 'draw' && isToolDrag) {
      updateStroke(pt);
      return;
    }
    if (state.activeTool === 'crop' && isToolDrag) {
      updateCropDrag(pt);
      return;
    }

    if (isPanningCanvas && state.zoom > 1.0) {
      const rect = imageFrame.getBoundingClientRect();
      const deltaX = e.clientX - lastPanX;
      const deltaY = e.clientY - lastPanY;

      lastPanX = e.clientX;
      lastPanY = e.clientY;

      // Pan suave baseado na escala atual
      const panSensitivity = 0.0015 / state.zoom;
      state.zoomOriginX = Math.max(0.05, Math.min(0.95, state.zoomOriginX - deltaX * panSensitivity));
      state.zoomOriginY = Math.max(0.05, Math.min(0.95, state.zoomOriginY - deltaY * panSensitivity));

      renderCanvas();
    }
  });

  imageFrame.addEventListener('pointerup', () => {
    if (isToolDrag) {
      if (state.activeTool === 'draw') endStroke();
      if (state.activeTool === 'crop') endCropDrag();
      return;
    }
    isPanningCanvas = false;
  });

  // ==========================================================================
  // UPLOAD E ARRASTAR & SOLTAR DE IMAGENS LOCAIS
  // ==========================================================================

  // Duplo clique na moldura para abrir seletor de arquivos
  imageFrame.addEventListener('dblclick', () => {
    fileInput.click();
  });

  // Botão visível para abrir o seletor de imagens
  uploadButton.addEventListener('click', () => {
    fileInput.click();
  });

  // Botão para baixar a imagem editada
  function downloadEditedImage() {
    if (!imageObj.complete || imageObj.naturalWidth === 0) return;
    const url = canvas.toDataURL('image/png');
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `atelie-editado-${Date.now()}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  downloadButton.addEventListener('click', downloadEditedImage);

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      loadLocalImageFile(file);
    }
  });

  // Suporte a Drag & Drop
  ['dragenter', 'dragover'].forEach(eventName => {
    imageFrame.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      imageFrame.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    imageFrame.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      imageFrame.classList.remove('drag-over');
    });
  });

  imageFrame.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && files[0].type.startsWith('image/')) {
      loadLocalImageFile(files[0]);
    }
  });

  function loadLocalImageFile(file) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      originalImageSrc = evt.target.result;
      imageObj.onload = () => {
        setCanvasSizeFromImage();
        originalCanvasWidth = canvas.width;
        originalCanvasHeight = canvas.height;

        // Resetar parâmetros ao carregar nova imagem
        state = { ...defaultState, textItems: [], drawings: [] };
        hideFocalRing();
        renderCanvas();
      };
      imageObj.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Suporte a teclado na Moldura
  imageFrame.addEventListener('keydown', (e) => {
    if (state.activeTool) {
      if (state.activeTool === 'crop') {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (state.pendingCrop) applyCrop(state.pendingCrop);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          state.pendingCrop = null;
          state.activeTool = null;
          renderCanvas();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        state.activeTool = null;
        state.pendingCrop = null;
        renderCanvas();
      }
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  // Escape global desliga qualquer ferramenta ativa
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.activeTool) {
      state.activeTool = null;
      state.pendingCrop = null;
      closeTextEditor(true);
      renderCanvas();
    }
  });

  // Evita que o clique nos controles role a página para focar o botão
  // (botões rentes à borda inferior deslocavam o canvas em ~56px ao ativar o corte)
  document.querySelectorAll('.abstract-control').forEach((btn) => {
    btn.addEventListener('mousedown', (e) => e.preventDefault());
  });
});
