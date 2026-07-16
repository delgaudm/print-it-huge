import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { Upload, FileImage, Download, Sun, Moon, ZoomIn, ZoomOut, RotateCcw, Layers, Grid3x3, Palette, ChevronDown, Target } from 'lucide-react';
import { StyleTipBox, Confetti, PrivacyTapeBadge } from './components';

const paperDims = {
  letter: { width: 215.9, height: 279.4 },
  a4: { width: 210, height: 297 }
};

function convertToGrayscale(imageData: ImageData): ImageData {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    data[i] = avg;
    data[i + 1] = avg;
    data[i + 2] = avg;
  }
  return imageData;
}

export default function App() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [paperSize, setPaperSize] = useState<'letter' | 'a4'>('letter');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pagesWide, setPagesWide] = useState(3);
  const [pagesHigh, setPagesHigh] = useState(3);
  const [dotSize, setDotSize] = useState(10);
  const [dotColor, setDotColor] = useState('#1a1a1a');
  const [style, setStyle] = useState<'dots' | 'squares' | 'diamonds' | 'lines' | 'dither' | 'cmyk' | 'hexagons' | 'stippling' | 'pixels' | 'upscale'>('dots');
  const [gridAngle, setGridAngle] = useState(0);
  const [cropMarks, setCropMarks] = useState(true);
  const [preserveAspectRatio, setPreserveAspectRatio] = useState(true);
  const [skipBlankPages, setSkipBlankPages] = useState(false);
  const [status, setStatus] = useState('');
  const [layoutMode, setLayoutMode] = useState<'pages' | 'wallSpace'>('pages');
  const [wallWidth, setWallWidth] = useState('');
  const [wallHeight, setWallHeight] = useState('');
  const [wallUnit, setWallUnit] = useState<'imperial' | 'metric'>('imperial');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hasUploaded, setHasUploaded] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [colorMode, setColorMode] = useState<'color' | 'mono'>('color');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setHasUploaded(true);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setHasUploaded(true);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const loadSampleImage = () => {
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 900;
    sampleCanvas.height = 1200;
    const ctx = sampleCanvas.getContext('2d');
    if (!ctx) return;

    const sky = ctx.createLinearGradient(0, 0, 0, sampleCanvas.height);
    sky.addColorStop(0, '#6b9bd2');
    sky.addColorStop(0.55, '#faf8f3');
    sky.addColorStop(1, '#ffbe0b');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, sampleCanvas.width, sampleCanvas.height);

    ctx.fillStyle = '#ff6eb4';
    ctx.beginPath();
    ctx.arc(675, 260, 150, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(0, 875);
    ctx.lineTo(260, 460);
    ctx.lineTo(480, 875);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2ec4b6';
    ctx.beginPath();
    ctx.moveTo(270, 900);
    ctx.lineTo(590, 380);
    ctx.lineTo(900, 900);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ff6b35';
    ctx.fillRect(0, 875, sampleCanvas.width, 325);

    ctx.fillStyle = 'rgba(250, 248, 243, 0.88)';
    ctx.font = 'bold 118px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HUGE', 450, 1035);

    const img = new Image();
    img.onload = () => {
      setImage(img);
      setHasUploaded(true);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };
    img.src = sampleCanvas.toDataURL('image/png');
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.5, 10));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.5, 0.25));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.25, Math.min(10, prev * delta)));
  };

  const handlePanStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0 && zoom > 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handlePanMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  const fitToAspectRatio = () => {
    if (!image) return;

    let pWidth = paperDims[paperSize].width;
    let pHeight = paperDims[paperSize].height;

    if (orientation === 'landscape') {
      [pWidth, pHeight] = [pHeight, pWidth];
    }

    const imageAspect = image.width / image.height;
    const pageAspect = pWidth / pHeight;

    // Calculate optimal pages to fit the image
    let newPagesWide = pagesWide;
    let newPagesHigh = pagesHigh;

    if (imageAspect > pageAspect) {
      // Image is wider than page aspect - fit to width
      newPagesHigh = Math.round(pagesWide / imageAspect);
      if (newPagesHigh < 1) newPagesHigh = 1;
    } else {
      // Image is taller than page aspect - fit to height
      newPagesWide = Math.round(pagesHigh * imageAspect);
      if (newPagesWide < 1) newPagesWide = 1;
    }

    setPagesWide(newPagesWide);
    setPagesHigh(newPagesHigh);
  };

  // Calculate wall dimensions from pages grid
  const calculateWallFromPages = (pagesWide: number, pagesHigh: number) => {
    let pWidth = paperDims[paperSize].width;
    let pHeight = paperDims[paperSize].height;

    if (orientation === 'landscape') {
      [pWidth, pHeight] = [pHeight, pWidth];
    }

    const totalWidthMm = pWidth * pagesWide;
    const totalHeightMm = pHeight * pagesHigh;

    let width: number, height: number;
    if (wallUnit === 'imperial') {
      width = Math.round((totalWidthMm / 304.8) * 10) / 10; // ft, 1 decimal
      height = Math.round((totalHeightMm / 304.8) * 10) / 10;
    } else {
      width = Math.round(totalWidthMm); // mm, round to nearest
      height = Math.round(totalHeightMm);
    }

    return { width, height };
  };

  // Calculate optimal pages from wall dimensions
  const calculatePagesFromWall = (wallWidth: number, wallHeight: number) => {
    let pWidth = paperDims[paperSize].width;
    let pHeight = paperDims[paperSize].height;

    if (orientation === 'landscape') {
      [pWidth, pHeight] = [pHeight, pWidth];
    }

    let wallWidthMm: number, wallHeightMm: number;

    if (wallUnit === 'imperial') {
      wallWidthMm = wallWidth * 304.8;
      wallHeightMm = wallHeight * 304.8;
    } else {
      wallWidthMm = wallWidth;
      wallHeightMm = wallHeight;
    }

    const calculatedPagesWide = Math.floor(wallWidthMm / pWidth);
    const calculatedPagesHigh = Math.floor(wallHeightMm / pHeight);

    return {
      pagesWide: Math.max(1, calculatedPagesWide),
      pagesHigh: Math.max(1, calculatedPagesHigh)
    };
  };

  const getLayoutMath = () => {
    let pWidth = paperDims[paperSize].width;
    let pHeight = paperDims[paperSize].height;

    if (orientation === 'landscape') {
      [pWidth, pHeight] = [pHeight, pWidth];
    }

    const totalWidthMm = pWidth * pagesWide;
    const totalHeightMm = pHeight * pagesHigh;

    let cols = Math.floor(totalWidthMm / dotSize);
    let rows = Math.floor(totalHeightMm / dotSize);
    let offsetX = 0;
    let offsetY = 0;

    if (preserveAspectRatio && image) {
      const imageAspect = image.width / image.height;
      const totalAspect = cols / rows;

      if (imageAspect > totalAspect) {
        // Image is wider - fit to width, add padding on top/bottom
        rows = Math.floor(cols / imageAspect);
        offsetY = Math.floor((totalHeightMm / dotSize - rows) / 2);
      } else {
        // Image is taller - fit to height, add padding on sides
        cols = Math.floor(rows * imageAspect);
        offsetX = Math.floor((totalWidthMm / dotSize - cols) / 2);
      }
    }

    // Calculate which pages contain content
    const colsPerPage = Math.floor(pWidth / dotSize);
    const rowsPerPage = Math.floor(pHeight / dotSize);
    const contentPages = new Set<string>();

    for (let pageY = 0; pageY < pagesHigh; pageY++) {
      for (let pageX = 0; pageX < pagesWide; pageX++) {
        const pageGridX = pageX * colsPerPage;
        const pageGridY = pageY * rowsPerPage;
        const pageGridXEnd = (pageX + 1) * colsPerPage;
        const pageGridYEnd = (pageY + 1) * rowsPerPage;

        // Check if this page intersects with the image area
        const imageGridX = offsetX;
        const imageGridY = offsetY;
        const imageGridXEnd = offsetX + cols;
        const imageGridYEnd = offsetY + rows;

        const hasContent = !(
          pageGridXEnd <= imageGridX ||
          pageGridX >= imageGridXEnd ||
          pageGridYEnd <= imageGridY ||
          pageGridY >= imageGridYEnd
        );

        if (hasContent) {
          contentPages.add(`${pageX},${pageY}`);
        }
      }
    }

    return { pWidth, pHeight, gridW: pagesWide, gridH: pagesHigh, totalWidthMm, totalHeightMm, dotSize, cols, rows, offsetX, offsetY, contentPages, colsPerPage, rowsPerPage };
  };

  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const math = getLayoutMath();

    const maxWidth = 500;
    const scale = maxWidth / math.totalWidthMm;
    canvas.width = maxWidth;
    canvas.height = math.totalHeightMm * scale;

    const offscreen = document.createElement('canvas');
    offscreen.width = math.cols;
    offscreen.height = math.rows;
    const oCtx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!oCtx) return;

    // Draw image with padding if preserving aspect ratio
    const imgCanvas = document.createElement('canvas');
    const imgCols = preserveAspectRatio ? math.cols : Math.floor(math.totalWidthMm / math.dotSize);
    const imgRows = preserveAspectRatio ? math.rows : Math.floor(math.totalHeightMm / math.dotSize);
    imgCanvas.width = imgCols;
    imgCanvas.height = imgRows;
    const imgCtx = imgCanvas.getContext('2d', { willReadFrequently: true });
    if (!imgCtx) return;

    imgCtx.drawImage(image, 0, 0, imgCols, imgRows);
    const imgData = imgCtx.getImageData(0, 0, imgCols, imgRows).data;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = dotColor;

    const previewDotMaxRadius = (math.dotSize * scale) / 2;

    let ditherData: Float32Array | null = null;
    let cmykData: Float32Array | null = null;

    if (style === 'dither') {
      ditherData = new Float32Array(math.cols * math.rows);
      for (let i = 0; i < math.cols * math.rows; i++) {
        const r = imgData[i * 4], g = imgData[i * 4 + 1], b = imgData[i * 4 + 2];
        ditherData[i] = 1 - ((0.299 * r + 0.587 * g + 0.114 * b) / 255);
      }
      for (let y = 0; y < math.rows; y++) {
        for (let x = 0; x < math.cols; x++) {
          const idx = y * math.cols + x;
          const oldVal = ditherData[idx];
          const newVal = oldVal > 0.5 ? 1.0 : 0.0;
          ditherData[idx] = newVal;
          const err = oldVal - newVal;
          if (x + 1 < math.cols) ditherData[idx + 1] += err * 7 / 16;
          if (y + 1 < math.rows) {
            if (x - 1 >= 0) ditherData[(y + 1) * math.cols + x - 1] += err * 3 / 16;
            ditherData[(y + 1) * math.cols + x] += err * 5 / 16;
            if (x + 1 < math.cols) ditherData[(y + 1) * math.cols + x + 1] += err * 1 / 16;
          }
        }
      }
    } else if (style === 'cmyk') {
      cmykData = new Float32Array(math.cols * math.rows * 4);
      for (let i = 0; i < math.cols * math.rows; i++) {
        const r = imgData[i * 4] / 255, g = imgData[i * 4 + 1] / 255, b = imgData[i * 4 + 2] / 255;
        const k = 1 - Math.max(r, g, b);
        const c = k === 1 ? 0 : (1 - r - k) / (1 - k);
        const m = k === 1 ? 0 : (1 - g - k) / (1 - k);
        const yVal = k === 1 ? 0 : (1 - b - k) / (1 - k);
        cmykData[i * 4] = c; cmykData[i * 4 + 1] = m; cmykData[i * 4 + 2] = yVal; cmykData[i * 4 + 3] = k;
      }
    }

    if (style === 'cmyk' && cmykData) {
      ctx.globalCompositeOperation = 'multiply';
      const angles = [0, 15, 75, 45];
      const colors = ['#FFFF00', '#00FFFF', '#FF00FF', '#000000'];
      const channels = [2, 0, 1, 3];
      const cx_mm = math.totalWidthMm / 2;
      const cy_mm = math.totalHeightMm / 2;
      const diag_mm = Math.sqrt(cx_mm ** 2 + cy_mm ** 2);
      const steps = Math.ceil(diag_mm / math.dotSize);

      for (let layer = 0; layer < 4; layer++) {
        ctx.fillStyle = colors[layer];
        const angleRad = (angles[layer] * Math.PI) / 180;
        const cos = Math.cos(angleRad), sin = Math.sin(angleRad);

        for (let y = -steps; y <= steps; y++) {
          for (let x = -steps; x <= steps; x++) {
            const dx = x * math.dotSize;
            const dy = y * math.dotSize;
            const sx_mm = dx * cos - dy * sin + cx_mm;
            const sy_mm = dx * sin + dy * cos + cy_mm;

            if (sx_mm < 0 || sx_mm > math.totalWidthMm || sy_mm < 0 || sy_mm > math.totalHeightMm) continue;

            const gridX = Math.floor(sx_mm / math.dotSize);
            const gridY = Math.floor(sy_mm / math.dotSize);
            const imgX = gridX - math.offsetX;
            const imgY = gridY - math.offsetY;

            if (gridX >= math.offsetX && gridX < math.cols + math.offsetX && gridY >= math.offsetY && gridY < math.rows + math.offsetY) {
              const val = cmykData[(imgY * math.cols + imgX) * 4 + channels[layer]];
              if (val > 0.05) {
                const radius = previewDotMaxRadius * val;
                ctx.beginPath();
                ctx.arc(sx_mm * scale, sy_mm * scale, radius, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    } else if (style === 'upscale') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const renderScale = canvas.width / math.totalWidthMm;
      ctx.drawImage(image, 0, 0, math.totalWidthMm * renderScale, math.totalHeightMm * renderScale);

      if (colorMode === 'mono') {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const grayscale = convertToGrayscale(imageData);
        ctx.putImageData(grayscale, 0, 0);
      }

      // Draw page grid lines
      ctx.strokeStyle = 'rgba(230, 57, 70, 0.6)';
      ctx.lineWidth = 1;
      for (let c = 1; c < math.gridW; c++) {
        const lineX = (c * math.pWidth) * scale;
        ctx.beginPath(); ctx.moveTo(lineX, 0); ctx.lineTo(lineX, canvas.height); ctx.stroke();
      }
      for (let r = 1; r < math.gridH; r++) {
        const lineY = (r * math.pHeight) * scale;
        ctx.beginPath(); ctx.moveTo(0, lineY); ctx.lineTo(canvas.width, lineY); ctx.stroke();
      }
    } else {
      const angleRad = (gridAngle * Math.PI) / 180;
      const cos = Math.cos(angleRad), sin = Math.sin(angleRad);
      const cx_mm = math.totalWidthMm / 2;
      const cy_mm = math.totalHeightMm / 2;
      const diag_mm = Math.sqrt(cx_mm ** 2 + cy_mm ** 2);
      const steps = Math.ceil(diag_mm / math.dotSize);

      for (let y = -steps; y <= steps; y++) {
        for (let x = -steps; x <= steps; x++) {
          const dx = x * math.dotSize;
          const dy = y * math.dotSize;

          let sx_mm = dx;
          let sy_mm = dy;

          if (style !== 'dither') {
            sx_mm = dx * cos - dy * sin + cx_mm;
            sy_mm = dx * sin + dy * cos + cy_mm;
          } else {
             // Dither doesn't use rotation, map directly to grid
             sx_mm = (x + steps) * math.dotSize;
             sy_mm = (y + steps) * math.dotSize;
          }

          if (sx_mm < 0 || sx_mm > math.totalWidthMm || sy_mm < 0 || sy_mm > math.totalHeightMm) continue;

          const gridX = Math.floor(sx_mm / math.dotSize);
          const gridY = Math.floor(sy_mm / math.dotSize);
          const imgX = gridX - math.offsetX;
          const imgY = gridY - math.offsetY;

          if (gridX >= math.offsetX && gridX < math.cols + math.offsetX && gridY >= math.offsetY && gridY < math.rows + math.offsetY) {
            const centerX = sx_mm * scale;
            const centerY = sy_mm * scale;

            if (style === 'dither' && ditherData) {
              if (ditherData[imgY * math.cols + imgX] === 1.0) {
                ctx.fillRect(centerX - previewDotMaxRadius, centerY - previewDotMaxRadius, previewDotMaxRadius * 2, previewDotMaxRadius * 2);
              }
            } else if (style !== 'dither') {
              const i = (imgY * math.cols + imgX) * 4;
              const luminance = (0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2]);
              const darkness = 1 - (luminance / 255);

              if (darkness > 0.05) {
                const radius = previewDotMaxRadius * darkness;

                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(angleRad);

                if (style === 'dots') {
                  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
                } else if (style === 'hexagons') {
                  ctx.beginPath();
                  for (let i = 0; i < 6; i++) {
                    const angle = (i * 60 - 30) * Math.PI / 180;
                    const x = radius * Math.cos(angle);
                    const y = radius * Math.sin(angle);
                    if (i === 0) {
                      ctx.moveTo(x, y);
                    } else {
                      ctx.lineTo(x, y);
                    }
                  }
                  ctx.closePath();
                  ctx.fill();
                } else if (style === 'stippling') {
                  // Deterministic random based on position
                  const seed = (gridX * 73856093 + gridY * 19349663) % 2147483647;
                  const rand1 = ((seed * 16807) % 2147483647) / 2147483647;
                  const rand2 = ((seed * 48271) % 2147483647) / 2147483647;

                  const numDots = Math.floor(darkness * 3) + 1;
                  for (let d = 0; d < numDots; d++) {
                    const dotSeed = seed * (d + 1) * 69069;
                    const dx = ((dotSeed * 8255) % 2147483647) / 2147483647 - 0.5;
                    const dy = ((dotSeed * 12345) % 2147483647) / 2147483647 - 0.5;
                    const stippleRadius = (previewDotMaxRadius * darkness) * (0.5 + ((dotSeed * 6907) % 2147483647) / 2147483647 * 0.5);
                    ctx.beginPath();
                    ctx.arc(dx * previewDotMaxRadius, dy * previewDotMaxRadius, stippleRadius, 0, Math.PI * 2);
                    ctx.fill();
                  }
                } else if (style === 'pixels') {
                  const pixelGap = previewDotMaxRadius * 0.2;
                  const pixelSize = (radius * 2) - pixelGap * 2;
                  ctx.fillRect(-pixelSize / 2, -pixelSize / 2, pixelSize, pixelSize);
                } else if (style === 'squares') {
                  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
                } else if (style === 'diamonds') {
                  ctx.rotate(Math.PI / 4);
                  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
                } else if (style === 'lines') {
                  const thickness = (math.dotSize * scale) * darkness;
                  ctx.fillRect(-previewDotMaxRadius, -thickness / 2, previewDotMaxRadius * 2, thickness);
                }

                ctx.restore();
              }
            }
          }
        }
      }
    }

    // Draw page grid lines (only for non-upscale styles, as upscale draws them internally)
    if (style !== 'upscale') {
      ctx.strokeStyle = 'rgba(230, 57, 70, 0.6)';
      ctx.lineWidth = 1;
      for (let c = 1; c < math.gridW; c++) {
        const lineX = (c * math.pWidth) * scale;
        ctx.beginPath(); ctx.moveTo(lineX, 0); ctx.lineTo(lineX, canvas.height); ctx.stroke();
      }
      for (let r = 1; r < math.gridH; r++) {
        const lineY = (r * math.pHeight) * scale;
        ctx.beginPath(); ctx.moveTo(0, lineY); ctx.lineTo(canvas.width, lineY); ctx.stroke();
      }
    }
  }, [image, paperSize, orientation, pagesWide, pagesHigh, dotSize, dotColor, style, gridAngle, colorMode]);

  const generatePDF = () => {
    if (!image) return;

    setIsGenerating(true);
    setStatus('Turning dots into pages...');
    setTimeout(() => setStatus('Almost there...'), 1000);
    setTimeout(() => setStatus('This is going to look great!'), 2000);

    setTimeout(() => {
      try {
        const math = getLayoutMath();
        const hexColor = dotColor.replace('#', '');

        const format = paperSize;
        const docOrientation = orientation === 'landscape' ? 'l' : 'p';

        const doc = new jsPDF({ orientation: docOrientation, unit: 'mm', format: format });

        const offscreen = document.createElement('canvas');
        offscreen.width = math.cols;
        offscreen.height = math.rows;
        const oCtx = offscreen.getContext('2d', { willReadFrequently: true });
        if (!oCtx) throw new Error("Could not get canvas context");

        // Draw image with padding if preserving aspect ratio
        const imgCols = preserveAspectRatio ? math.cols : Math.floor(math.totalWidthMm / math.dotSize);
        const imgRows = preserveAspectRatio ? math.rows : Math.floor(math.totalHeightMm / math.dotSize);
        oCtx.drawImage(image, 0, 0, imgCols, imgRows);
        const imgData = oCtx.getImageData(0, 0, imgCols, imgRows).data;

        const maxRadius = math.dotSize / 2;
        let isFirstPage = true;

        let ditherData: Float32Array | null = null;
        let cmykData: Float32Array | null = null;

        if (style === 'dither') {
          ditherData = new Float32Array(math.cols * math.rows);
          for (let i = 0; i < math.cols * math.rows; i++) {
            const r = imgData[i * 4], g = imgData[i * 4 + 1], b = imgData[i * 4 + 2];
            ditherData[i] = 1 - ((0.299 * r + 0.587 * g + 0.114 * b) / 255);
          }
          for (let y = 0; y < math.rows; y++) {
            for (let x = 0; x < math.cols; x++) {
              const idx = y * math.cols + x;
              const oldVal = ditherData[idx];
              const newVal = oldVal > 0.5 ? 1.0 : 0.0;
              ditherData[idx] = newVal;
              const err = oldVal - newVal;
              if (x + 1 < math.cols) ditherData[idx + 1] += err * 7 / 16;
              if (y + 1 < math.rows) {
                if (x - 1 >= 0) ditherData[(y + 1) * math.cols + x - 1] += err * 3 / 16;
                ditherData[(y + 1) * math.cols + x] += err * 5 / 16;
                if (x + 1 < math.cols) ditherData[(y + 1) * math.cols + x + 1] += err * 1 / 16;
              }
            }
          }
        } else if (style === 'cmyk') {
          cmykData = new Float32Array(math.cols * math.rows * 4);
          for (let i = 0; i < math.cols * math.rows; i++) {
            const r = imgData[i * 4] / 255, g = imgData[i * 4 + 1] / 255, b = imgData[i * 4 + 2] / 255;
            const k = 1 - Math.max(r, g, b);
            const c = k === 1 ? 0 : (1 - r - k) / (1 - k);
            const m = k === 1 ? 0 : (1 - g - k) / (1 - k);
            const yVal = k === 1 ? 0 : (1 - b - k) / (1 - k);
            cmykData[i * 4] = c; cmykData[i * 4 + 1] = m; cmykData[i * 4 + 2] = yVal; cmykData[i * 4 + 3] = k;
          }
        }

        for (let pageY = 0; pageY < math.gridH; pageY++) {
          for (let pageX = 0; pageX < math.gridW; pageX++) {
            // Skip blank pages if option is enabled
            if (skipBlankPages && math.contentPages && !math.contentPages.has(`${pageX},${pageY}`)) {
              continue;
            }

            if (!isFirstPage) {
              doc.addPage(format, docOrientation);
            }
            isFirstPage = false;

            // Set fill color for this page (must be set after addPage for subsequent pages)
            if (style !== 'cmyk') {
              doc.setFillColor(hexColor);
            }

            const pageStartX_mm = pageX * math.pWidth;
            const pageStartY_mm = pageY * math.pHeight;
            const pageEndX_mm = pageStartX_mm + math.pWidth;
            const pageEndY_mm = pageStartY_mm + math.pHeight;

            if (style === 'cmyk' && cmykData) {
              const angles = [0, 15, 75, 45];
              const colors = ['#FFFF00', '#00FFFF', '#FF00FF', '#000000'];
              const channels = [2, 0, 1, 3];
              const cx_mm = math.totalWidthMm / 2;
              const cy_mm = math.totalHeightMm / 2;
              const diag_mm = Math.sqrt(cx_mm ** 2 + cy_mm ** 2);
              const steps = Math.ceil(diag_mm / math.dotSize);

              for (let layer = 0; layer < 4; layer++) {
                doc.setFillColor(colors[layer]);
                try {
                  (doc as any).setGState(new (doc as any).GState({ blendMode: 'Multiply' }));
                } catch (e) { /* ignore if not supported */ }

                const angleRad = (angles[layer] * Math.PI) / 180;
                const cos = Math.cos(angleRad), sin = Math.sin(angleRad);

                for (let y = -steps; y <= steps; y++) {
                  for (let x = -steps; x <= steps; x++) {
                    const dx = x * math.dotSize;
                    const dy = y * math.dotSize;
                    const sx_mm = dx * cos - dy * sin + cx_mm;
                    const sy_mm = dx * sin + dy * cos + cy_mm;

                    if (sx_mm >= pageStartX_mm && sx_mm <= pageEndX_mm && sy_mm >= pageStartY_mm && sy_mm <= pageEndY_mm) {
                      const gridX = Math.floor(sx_mm / math.dotSize);
                      const gridY = Math.floor(sy_mm / math.dotSize);
                      const imgX = gridX - math.offsetX;
                      const imgY = gridY - math.offsetY;

                      if (gridX >= math.offsetX && gridX < math.cols + math.offsetX && gridY >= math.offsetY && gridY < math.rows + math.offsetY) {
                        const val = cmykData[(imgY * math.cols + imgX) * 4 + channels[layer]];
                        if (val > 0.05) {
                          const radius = maxRadius * val;
                          doc.circle(sx_mm - pageStartX_mm, sy_mm - pageStartY_mm, radius, 'F');
                        }
                      }
                    }
                  }
                }
              }
              try { (doc as any).setGState(new (doc as any).GState({ blendMode: 'Normal' })); } catch (e) { }
            } else if (style === 'upscale') {
              const pageWidthPx = math.pWidth * 3.78;
              const pageHeightPx = math.pHeight * 3.78;

              const pageCanvas = document.createElement('canvas');
              const pageCtx = pageCanvas.getContext('2d');
              if (!pageCtx) continue;

              pageCanvas.width = pageWidthPx;
              pageCanvas.height = pageHeightPx;

              const sourceX = (pageX * math.pWidth / math.totalWidthMm) * image.width;
              const sourceY = (pageY * math.pHeight / math.totalHeightMm) * image.height;
              const sourceWidth = (math.pWidth / math.totalWidthMm) * image.width;
              const sourceHeight = (math.pHeight / math.totalHeightMm) * image.height;

              pageCtx.drawImage(
                image,
                sourceX, sourceY, sourceWidth, sourceHeight,
                0, 0, pageWidthPx, pageHeightPx
              );

              if (colorMode === 'mono') {
                const imageData = pageCtx.getImageData(0, 0, pageWidthPx, pageHeightPx);
                const grayscale = convertToGrayscale(imageData);
                pageCtx.putImageData(grayscale, 0, 0);
              }

              const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
              doc.addImage(imgData, 'JPEG', 0, 0, math.pWidth, math.pHeight);

              if (cropMarks) {
                doc.setDrawColor('#cccccc');
                doc.setLineWidth(0.5);
                const cmLen = 5;

                doc.line(0, cmLen, cmLen, cmLen);
                doc.line(cmLen, 0, cmLen, cmLen);
                doc.line(math.pWidth - cmLen, cmLen, math.pWidth, cmLen);
                doc.line(math.pWidth - cmLen, 0, math.pWidth - cmLen, cmLen);
                doc.line(0, math.pHeight - cmLen, cmLen, math.pHeight - cmLen);
                doc.line(cmLen, math.pHeight, cmLen, math.pHeight - cmLen);
                doc.line(math.pWidth - cmLen, math.pHeight - cmLen, math.pWidth, math.pHeight - cmLen); doc.line(math.pWidth - cmLen, math.pHeight, math.pWidth - cmLen, math.pHeight - cmLen);

                doc.setFontSize(8);
                doc.setTextColor('#999999');
                doc.text(`Row ${pageY + 1}, Col ${pageX + 1}`, math.pWidth - 25, math.pHeight - 5);
              }
            } else {
              const angleRad = (gridAngle * Math.PI) / 180;
              const cos = Math.cos(angleRad), sin = Math.sin(angleRad);
              const cx_mm = math.totalWidthMm / 2;
              const cy_mm = math.totalHeightMm / 2;
              const diag_mm = Math.sqrt(cx_mm ** 2 + cy_mm ** 2);
              const steps = Math.ceil(diag_mm / math.dotSize);

              for (let y = -steps; y <= steps; y++) {
                for (let x = -steps; x <= steps; x++) {
                  const dx = x * math.dotSize;
                  const dy = y * math.dotSize;

                  let sx_mm = dx;
                  let sy_mm = dy;

                  if (style !== 'dither') {
                    sx_mm = dx * cos - dy * sin + cx_mm;
                    sy_mm = dx * sin + dy * cos + cy_mm;
                  } else {
                     sx_mm = (x + steps) * math.dotSize;
                     sy_mm = (y + steps) * math.dotSize;
                  }

                  if (sx_mm >= pageStartX_mm && sx_mm <= pageEndX_mm && sy_mm >= pageStartY_mm && sy_mm <= pageEndY_mm) {
                    const gridX = Math.floor(sx_mm / math.dotSize);
                    const gridY = Math.floor(sy_mm / math.dotSize);
                    const imgX = gridX - math.offsetX;
                    const imgY = gridY - math.offsetY;

                    if (gridX >= math.offsetX && gridX < math.cols + math.offsetX && gridY >= math.offsetY && gridY < math.rows + math.offsetY) {
                      const xPos = sx_mm - pageStartX_mm;
                      const yPos = sy_mm - pageStartY_mm;

                      if (style === 'dither' && ditherData) {
                        if (ditherData[imgY * math.cols + imgX] === 1.0) {
                          doc.rect(xPos - maxRadius, yPos - maxRadius, math.dotSize, math.dotSize, 'F');
                        }
                      } else if (style !== 'dither') {
                        const i = (imgY * math.cols + imgX) * 4;
                        const luminance = (0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2]);
                        const darkness = 1 - (luminance / 255);

                        if (darkness > 0.05) {
                          const radius = maxRadius * darkness;

                          if (style === 'dots') {
                            doc.circle(xPos, yPos, radius, 'F');
                          } else if (style === 'hexagons') {
                            const hexRadius = radius * 0.95;
                            const hexVertices = [];
                            for (let i = 0; i < 6; i++) {
                              const angle = (i * 60 - 30) * Math.PI / 180;
                              const vx = xPos + hexRadius * Math.cos(angle);
                              const vy = yPos + hexRadius * Math.sin(angle);
                              hexVertices.push([vx, vy]);
                            }
                            doc.lines([
                              [hexVertices[1][0] - hexVertices[0][0], hexVertices[1][1] - hexVertices[0][1]],
                              [hexVertices[2][0] - hexVertices[1][0], hexVertices[2][1] - hexVertices[1][1]],
                              [hexVertices[3][0] - hexVertices[2][0], hexVertices[3][1] - hexVertices[2][1]],
                              [hexVertices[4][0] - hexVertices[3][0], hexVertices[4][1] - hexVertices[3][1]],
                              [hexVertices[5][0] - hexVertices[4][0], hexVertices[5][1] - hexVertices[4][1]],
                              [hexVertices[0][0] - hexVertices[5][0], hexVertices[0][1] - hexVertices[5][1]]
                            ], hexVertices[0][0], hexVertices[0][1], [1, 1], 'F', true);
                          } else if (style === 'stippling') {
                            // Deterministic random based on position
                            const seed = (gridX * 73856093 + gridY * 19349663) % 2147483647;
                            const numDots = Math.floor(darkness * 3) + 1;
                            for (let d = 0; d < numDots; d++) {
                              const dotSeed = seed * (d + 1) * 69069;
                              const dx = ((dotSeed * 8255) % 2147483647) / 2147483647 - 0.5;
                              const dy = ((dotSeed * 12345) % 2147483647) / 2147483647 - 0.5;
                              const stippleRadius = (maxRadius * darkness) * (0.5 + ((dotSeed * 6907) % 2147483647) / 2147483647 * 0.5);
                              doc.circle(xPos + dx * math.dotSize, yPos + dy * math.dotSize, stippleRadius, 'F');
                            }
                          } else if (style === 'squares') {
                            const rCos = radius * cos;
                            const rSin = radius * sin;
                            const pts = [
                              [xPos - rCos + rSin, yPos - rSin - rCos],
                              [xPos + rCos + rSin, yPos + rSin - rCos],
                              [xPos + rCos - rSin, yPos + rSin + rCos],
                              [xPos - rCos - rSin, yPos - rSin + rCos]
                            ];
                            doc.lines([[pts[1][0]-pts[0][0], pts[1][1]-pts[0][1]], [pts[2][0]-pts[1][0], pts[2][1]-pts[1][1]], [pts[3][0]-pts[2][0], pts[3][1]-pts[2][1]], [pts[0][0]-pts[3][0], pts[0][1]-pts[3][1]]], pts[0][0], pts[0][1], [1,1], 'F', true);
                          } else if (style === 'pixels') {
                            const pixelGap = maxRadius * 0.2;
                            const pixelSize = (radius * 2) - pixelGap * 2;
                            doc.rect(xPos - pixelSize / 2, yPos - pixelSize / 2, pixelSize, pixelSize, 'F');
                          } else if (style === 'diamonds') {
                            const dAngle = angleRad + Math.PI / 4;
                            const dCos = Math.cos(dAngle);
                            const dSin = Math.sin(dAngle);
                            const rCos = radius * dCos;
                            const rSin = radius * dSin;
                            const pts = [
                              [xPos - rCos + rSin, yPos - rSin - rCos],
                              [xPos + rCos + rSin, yPos + rSin - rCos],
                              [xPos + rCos - rSin, yPos + rSin + rCos],
                              [xPos - rCos - rSin, yPos - rSin + rCos]
                            ];
                            doc.lines([[pts[1][0]-pts[0][0], pts[1][1]-pts[0][1]], [pts[2][0]-pts[1][0], pts[2][1]-pts[1][1]], [pts[3][0]-pts[2][0], pts[3][1]-pts[2][1]], [pts[0][0]-pts[3][0], pts[0][1]-pts[3][1]]], pts[0][0], pts[0][1], [1,1], 'F', true);
                          } else if (style === 'lines') {
                            const thickness = math.dotSize * darkness;
                            const halfThick = thickness / 2;
                            const pts = [
                              [xPos - maxRadius * cos + halfThick * sin, yPos - maxRadius * sin - halfThick * cos],
                              [xPos + maxRadius * cos + halfThick * sin, yPos + maxRadius * sin - halfThick * cos],
                              [xPos + maxRadius * cos - halfThick * sin, yPos + maxRadius * sin + halfThick * cos],
                              [xPos - maxRadius * cos - halfThick * sin, yPos - maxRadius * sin + halfThick * cos]
                            ];
                            doc.lines([[pts[1][0]-pts[0][0], pts[1][1]-pts[0][1]], [pts[2][0]-pts[1][0], pts[2][1]-pts[1][1]], [pts[3][0]-pts[2][0], pts[3][1]-pts[2][1]], [pts[0][0]-pts[3][0], pts[0][1]-pts[3][1]]], pts[0][0], pts[0][1], [1,1], 'F', true);
                          }
                        }
                      }
                    }
                  }
                }
              }
            }

            if (cropMarks) {
              doc.setDrawColor('#cccccc');
              doc.setLineWidth(0.5);
              const cmLen = 5;

              doc.line(0, cmLen, cmLen, cmLen); doc.line(cmLen, 0, cmLen, cmLen);
              doc.line(math.pWidth - cmLen, cmLen, math.pWidth, cmLen); doc.line(math.pWidth - cmLen, 0, math.pWidth - cmLen, cmLen);
              doc.line(0, math.pHeight - cmLen, cmLen, math.pHeight - cmLen); doc.line(cmLen, math.pHeight, cmLen, math.pHeight - cmLen);
              doc.line(math.pWidth - cmLen, math.pHeight - cmLen, math.pWidth, math.pHeight - cmLen); doc.line(math.pWidth - cmLen, math.pHeight, math.pWidth - cmLen, math.pHeight - cmLen);

              doc.setFontSize(8);
              doc.setTextColor('#999999');
              doc.text(`Row ${pageY + 1}, Col ${pageX + 1}`, math.pWidth - 25, math.pHeight - 5);
            }
          }
        }

        doc.save('PrintItHuge_Poster.pdf');
        setStatus('PDF downloaded successfully!');
        setGenerationComplete(true);
      } catch (error) {
        console.error(error);
        setStatus('Error generating PDF. Try smaller dimensions or a larger dot size.');
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-[#0f0f0f]' : 'bg-[#f5f0e6]'}`}>
      {/* Paper texture overlay */}
      <div className="fixed inset-0 paper-texture pointer-events-none z-50" />
      <div className="fixed inset-0 halftone-overlay pointer-events-none z-50" />

      <div className="max-w-7xl mx-auto px-3 py-2 lg:py-3 relative z-10 min-h-screen flex flex-col xl:flex-row gap-3 pb-24">
        {/* Left Column - Header + Controls */}
        <div className="w-full xl:w-[320px] flex flex-col flex-shrink-0 space-y-2 pb-32 xl:pb-0">
          {/* Header */}
          <header className="animate-slide-up">
            <div className="relative">
              <div className="absolute -top-1 -left-1 w-3 h-3 bg-[#ff6b35] rounded-sm" style={{ transform: 'rotate(45deg)' }} />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#ff6eb4] rounded-sm" style={{ transform: 'rotate(-45deg)' }} />
              <div className="bg-white border-3 border-[#1a1a1a] p-2 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] relative">
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#1a1a1a]" style={{ fontFamily: 'var(--font-display)' }}>
                  PRINT IT HUGE
                </h1>
                <div className="mt-0.5 flex items-center gap-1">
                  <div className="h-0.5 flex-1 bg-[#ff6b35]" />
                  <div className="h-0.5 flex-1 bg-[#ff6eb4]" />
                  <div className="h-0.5 flex-1 bg-[#6b9bd2]" />
                </div>
                <p className="mt-1.5 text-xs text-[#1a1a1a] opacity-80 font-medium">
                  Turn pictures into giant wall posters
                </p>
              </div>
            </div>
          </header>

          {/* Controls Panel */}
          <div className="w-full space-y-2 animate-slide-up stagger-1">
            {/* Unified Layout Section */}
            <div className={`${darkMode ? 'bg-[#1a1a1a]' : 'bg-white'} border-3 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] p-2.5 animate-slide-up stagger-1 transition-all duration-300 ${hasUploaded ? 'opacity-100' : 'opacity-30'}`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className={`w-5 h-5 border-2 border-[#1a1a1a] flex items-center justify-center font-bold text-xs transition-all duration-300 ${hasUploaded ? 'bg-[#ff6b35] text-white' : 'bg-white text-[#999]'}`}>1</div>
                <h3 className={`text-base font-bold transition-all duration-300 ${hasUploaded ? darkMode ? 'text-[#faf8f3]' : 'text-[#1a1a1a]' : darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/40'}`} style={{ fontFamily: 'var(--font-display)' }}>
                  {hasUploaded ? 'HOW BIG DO YOU WANT IT?' : 'LAYOUT'}
                </h3>
              </div>

              <div className="space-y-2">
                {/* Mode Toggle */}
                <div>
                  <label className={`block text-xs font-bold mb-0.5 uppercase tracking-wide ${darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/70'}`}>
                    Calculate by:
                  </label>
                  <select
                    className={`w-full border-2 border-[#1a1a1a] p-1.5 text-xs font-medium outline-none transition-all focus:shadow-[1.5px_1.5px_0px_0px_rgba(26,26,26,1)] ${darkMode ? 'bg-[#1a1a1a] text-[#fff]' : 'bg-white text-[#1a1a1a]'}`}
                    value={layoutMode}
                    onChange={(e) => {
                      const newMode = e.target.value as 'pages' | 'wallSpace';
                      setLayoutMode(newMode);

                      // When switching to Wall Space mode, initialize from current pages if empty
                      if (newMode === 'wallSpace' && (!wallWidth || !wallHeight)) {
                        const wallDims = calculateWallFromPages(pagesWide, pagesHigh);
                        setWallWidth(wallDims.width.toString());
                        setWallHeight(wallDims.height.toString());
                      }

                      // When switching to Pages mode, calculate from wall dimensions if they exist
                      if (newMode === 'pages' && wallWidth && wallHeight) {
                        const wallW = parseFloat(wallWidth) || 0;
                        const wallH = parseFloat(wallHeight) || 0;
                        const pages = calculatePagesFromWall(wallW, wallH);
                        setPagesWide(pages.pagesWide);
                        setPagesHigh(pages.pagesHigh);
                      }
                    }}
                  >
                    <option value="pages">Pages</option>
                    <option value="wallSpace">Wall Space</option>
                  </select>
                </div>

                {/* Paper Format */}
                <div>
                  <label className={`block text-xs font-bold mb-0.5 uppercase tracking-wide ${darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/70'}`}>Paper Format</label>
                  <select
                    className={`w-full border-2 border-[#1a1a1a] p-1.5 text-xs font-medium outline-none transition-all focus:shadow-[1.5px_1.5px_0px_0px_rgba(26,26,26,1)] ${darkMode ? 'bg-[#1a1a1a] text-[#fff]' : 'bg-white text-[#1a1a1a]'}`}
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value as 'letter' | 'a4')}
                  >
                    <option value="letter">US Letter (8.5" x 11")</option>
                    <option value="a4">A4 (210mm x 297mm)</option>
                  </select>
                </div>

                {/* Orientation */}
                <div>
                  <label className={`block text-xs font-bold mb-0.5 uppercase tracking-wide ${darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/70'}`}>Orientation</label>
                  <select
                    className={`w-full border-2 border-[#1a1a1a] p-1.5 text-xs font-medium outline-none transition-all focus:shadow-[1.5px_1.5px_0px_0px_rgba(26,26,26,1)] ${darkMode ? 'bg-[#1a1a1a] text-[#fff]' : 'bg-white text-[#1a1a1a]'}`}
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')}
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>

                {/* Dynamic Input Section */}
                {layoutMode === 'wallSpace' ? (
                  // Wall Space Inputs
                  <>
                    <div>
                      <label className={`block text-xs font-bold mb-0.5 uppercase tracking-wide ${darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/70'}`}>Measurement Unit</label>
                      <select
                        className={`w-full border-2 border-[#1a1a1a] p-1.5 text-xs font-medium outline-none transition-all focus:shadow-[1.5px_1.5px_0px_0px_rgba(26,26,26,1)] ${darkMode ? 'bg-[#1a1a1a] text-[#fff]' : 'bg-white text-[#1a1a1a]'}`}
                        value={wallUnit}
                        onChange={(e) => setWallUnit(e.target.value as 'imperial' | 'metric')}
                      >
                        <option value="imperial">Imperial (feet)</option>
                        <option value="metric">Metric (mm)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`block text-xs font-bold mb-0.5 uppercase tracking-wide ${darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/70'}`}>
                          Width ({wallUnit === 'imperial' ? 'ft' : 'mm'})
                        </label>
                        <input
                          type="number"
                          min="0.1" step="0.1"
                          placeholder={wallUnit === 'imperial' ? '4' : '1200'}
                          className={`w-full border-2 border-[#1a1a1a] p-1.5 text-xs font-medium outline-none transition-all focus:shadow-[1.5px_1.5px_0px_0px_rgba(26,26,26,1)] ${darkMode ? 'bg-[#1a1a1a] text-[#fff]' : 'bg-white text-[#1a1a1a]'}`}
                          value={wallWidth}
                          onChange={(e) => {
                            setWallWidth(e.target.value);
                            // Live-update pages when wall dimensions change
                            const wallW = parseFloat(e.target.value) || 0;
                            const wallH = parseFloat(wallHeight) || 0;
                            if (wallW > 0 && wallH > 0) {
                              const pages = calculatePagesFromWall(wallW, wallH);
                              setPagesWide(pages.pagesWide);
                              setPagesHigh(pages.pagesHigh);
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-bold mb-0.5 uppercase tracking-wide ${darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/70'}`}>
                          Height ({wallUnit === 'imperial' ? 'ft' : 'mm'})
                        </label>
                        <input
                          type="number"
                          min="0.1" step="0.1"
                          placeholder={wallUnit === 'imperial' ? '7' : '2100'}
                          className={`w-full border-2 border-[#1a1a1a] p-1.5 text-xs font-medium outline-none transition-all focus:shadow-[1.5px_1.5px_0px_0px_rgba(26,26,26,1)] ${darkMode ? 'bg-[#1a1a1a] text-[#fff]' : 'bg-white text-[#1a1a1a]'}`}
                          value={wallHeight}
                          onChange={(e) => {
                            setWallHeight(e.target.value);
                            // Live-update pages when wall dimensions change
                            const wallW = parseFloat(wallWidth) || 0;
                            const wallH = parseFloat(e.target.value) || 0;
                            if (wallW > 0 && wallH > 0) {
                              const pages = calculatePagesFromWall(wallW, wallH);
                              setPagesWide(pages.pagesWide);
                              setPagesHigh(pages.pagesHigh);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  // Pages Inputs
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`block text-xs font-bold mb-0.5 uppercase tracking-wide ${darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/70'}`}>Pages Wide</label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        className={`w-full border-2 border-[#1a1a1a] p-1.5 text-xs font-medium outline-none transition-all focus:shadow-[1.5px_1.5px_0px_0px_rgba(26,26,26,1)] ${darkMode ? 'bg-[#1a1a1a] text-[#fff]' : 'bg-white text-[#1a1a1a]'}`}
                        value={pagesWide}
                        onChange={(e) => setPagesWide(parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold mb-0.5 uppercase tracking-wide ${darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/70'}`}>Pages High</label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        className={`w-full border-2 border-[#1a1a1a] p-1.5 text-xs font-medium outline-none transition-all focus:shadow-[1.5px_1.5px_0px_0px_rgba(26,26,26,1)] ${darkMode ? 'bg-[#1a1a1a] text-[#fff]' : 'bg-white text-[#1a1a1a]'}`}
                        value={pagesHigh}
                        onChange={(e) => setPagesHigh(parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                )}

                {/* Info Box - Shows conversion results */}
                <div className={`p-1.5 border-2 border-[#1a1a1a] ${darkMode ? 'bg-[#1a1a1a]/50' : 'bg-[#f5f0e6]/50'}`}>
                  {(() => {
                    // Calculate total pages and check if too many
                    let totalPages = 0;
                    if (layoutMode === 'wallSpace') {
                      const wallW = parseFloat(wallWidth) || 0;
                      const wallH = parseFloat(wallHeight) || 0;
                      const pages = calculatePagesFromWall(wallW, wallH);
                      totalPages = pages.pagesWide * pages.pagesHigh;
                    } else {
                      totalPages = pagesWide * pagesHigh;
                    }
                    const isTooMany = totalPages > 1000;

                    return (
                      <>
                        {/* Warning for large page counts */}
                        {isTooMany && (
                          <p className="text-[10px] font-bold mb-1 text-[#e63946]">
                            ⚠️ This will create 1000+ pages
                          </p>
                        )}

                        {layoutMode === 'wallSpace' ? (
                          // In Wall Space mode, show calculated pages
                          (() => {
                            const wallW = parseFloat(wallWidth) || 0;
                            const wallH = parseFloat(wallHeight) || 0;
                            const pages = calculatePagesFromWall(wallW, wallH);

                            return (
                              <div className="grid grid-cols-2 gap-1">
                                <div className={`text-center p-1 border border-[#1a1a1a] ${darkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
                                  <div className={`text-[10px] ${darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/60'}`}>Wide</div>
                                  <div className={`text-lg font-bold ${darkMode ? 'text-[#ff6b35]' : 'text-[#1a1a1a]'}`}>
                                    {pages.pagesWide}
                                  </div>
                                </div>
                                <div className={`text-center p-1 border border-[#1a1a1a] ${darkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
                                  <div className={`text-[10px] ${darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/60'}`}>High</div>
                                  <div className={`text-lg font-bold ${darkMode ? 'text-[#ff6b35]' : 'text-[#1a1a1a]'}`}>
                                    {pages.pagesHigh}
                                  </div>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          // In Pages mode, show calculated wall dimensions
                          (() => {
                            const wallDims = calculateWallFromPages(pagesWide, pagesHigh);
                            const unitLabel = wallUnit === 'imperial' ? 'ft' : 'mm';
                            const formattedWidth = wallUnit === 'imperial' ? wallDims.width.toFixed(1) : wallDims.width.toFixed(0);
                            const formattedHeight = wallUnit === 'imperial' ? wallDims.height.toFixed(1) : wallDims.height.toFixed(0);

                            return (
                              <div className="text-center">
                                <div className={`text-[10px] ${darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/60'}`}>Wall Size</div>
                                <div className={`text-sm font-bold ${darkMode ? 'text-[#ff6b35]' : 'text-[#1a1a1a]'}`}>
                                  {formattedWidth} × {formattedHeight} {unitLabel}
                                </div>
                              </div>
                            );
                          })()
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Preserve Aspect Ratio */}
                <div className={`p-1.5 border-2 border-[#1a1a1a] ${darkMode ? 'bg-[#1a1a1a]/50' : 'bg-[#f5f0e6]/50'}`}>
                  <label className="flex items-center gap-2 cursor-pointer mb-1">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={preserveAspectRatio}
                        onChange={(e) => setPreserveAspectRatio(e.target.checked)}
                      />
                      <div className={`w-4 h-4 border-2 border-[#1a1a1a] bg-white peer-checked:bg-[#6b9bd2] transition-colors flex items-center justify-center`}>
                        {preserveAspectRatio && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wide ${darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/70'}`}>Preserve Aspect Ratio</span>
                  </label>
                  {image && preserveAspectRatio && (
                    <button
                      onClick={fitToAspectRatio}
                      className="w-full py-1 px-2 text-xs font-bold bg-[#6b9bd2] hover:bg-[#6b9bd2]/90 text-white border-2 border-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                    >
                      FIT TO ASPECT RATIO
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Style Section */}
            <div className={`${darkMode ? 'bg-[#1a1a1a]' : 'bg-white'} border-3 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] p-2.5 animate-slide-up stagger-3 transition-all duration-300 ${hasUploaded ? 'opacity-100' : 'opacity-30'}`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className={`w-5 h-5 border-2 border-[#1a1a1a] flex items-center justify-center font-bold text-xs transition-all duration-300 ${hasUploaded ? 'bg-[#ff6eb4] text-white' : 'bg-white text-[#999]'}`}>2</div>
                <h3 className={`text-base font-bold transition-all duration-300 ${hasUploaded ? darkMode ? 'text-[#faf8f3]' : 'text-[#1a1a1a]' : darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/40'}`} style={{ fontFamily: 'var(--font-display)' }}>
                  {hasUploaded ? 'PICK A STYLE!' : 'STYLE'}
                </h3>
              </div>

              <div className="space-y-1.5">
                <div>
                  <label className={`block text-xs font-bold mb-0.5 uppercase tracking-wide ${darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/70'}`}>Pattern</label>
                  <select
                    className={`w-full border-2 border-[#1a1a1a] p-1.5 text-xs font-medium outline-none transition-all focus:shadow-[1.5px_1.5px_0px_0px_rgba(26,26,26,1)] ${darkMode ? 'bg-[#1a1a1a] text-[#fff]' : 'bg-white text-[#1a1a1a]'}`}
                    value={style}
                    onChange={(e) => setStyle(e.target.value as any)}
                  >
                    <option value="dots">Dots</option>
                    <option value="squares">Squares</option>
                    <option value="diamonds">Diamonds</option>
                    <option value="pixels">Pixels</option>
                    <option value="lines">Lines</option>
                    <option value="hexagons">Hexagons</option>
                    <option value="stippling">Stippling</option>
                    <option value="dither">Dither</option>
                    <option value="cmyk">CMYK</option>
                    <option value="upscale">Upscale (Full Photo)</option>
                  </select>
                </div>

                {style === 'upscale' && (
                  <div>
                    <label className={`block text-xs font-bold mb-0.5 uppercase tracking-wide ${darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/70'}`}>
                      Color Mode
                    </label>
                    <select
                      className={`w-full border-2 border-[#1a1a1a] p-1.5 text-xs font-medium outline-none transition-all focus:shadow-[1.5px_1.5px_0px_0px_rgba(26,26,26,1)] ${darkMode ? 'bg-[#1a1a1a] text-[#fff]' : 'bg-white text-[#1a1a1a]'}`}
                      value={colorMode}
                      onChange={(e) => setColorMode(e.target.value as 'color' | 'mono')}
                    >
                      <option value="color">Full Color</option>
                      <option value="mono">Monochrome</option>
                    </select>
                  </div>
                )}

                {hasUploaded && <StyleTipBox />}

                <div>
                  <label className={`block text-xs font-bold mb-0.5 uppercase tracking-wide ${darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/70'}`}>Dot Size (mm)</label>
                  <input
                    type="number"
                    min="2" max="50"
                    className={`w-full border-2 border-[#1a1a1a] p-1.5 text-xs font-medium outline-none transition-all focus:shadow-[1.5px_1.5px_0px_0px_rgba(26,26,26,1)] ${darkMode ? 'bg-[#1a1a1a] text-[#fff]' : 'bg-white text-[#1a1a1a]'}`}
                    value={dotSize}
                    onChange={(e) => setDotSize(parseFloat(e.target.value) || 2)}
                  />
                </div>

                {style !== 'dither' && style !== 'cmyk' && style !== 'upscale' && (
                  <div>
                    <label className={`block text-xs font-bold mb-0.5 uppercase tracking-wide ${darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/70'}`}>Angle</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="range"
                        min="0" max="90"
                        className="flex-1 h-1.5 bg-[#1a1a1a]/10 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#ff6b35] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#1a1a1a] [&::-webkit-slider-thumb]:rounded-none"
                        value={gridAngle}
                        onChange={(e) => setGridAngle(parseInt(e.target.value) || 0)}
                      />
                      <span className={`text-xs font-bold font-mono w-8 text-right ${darkMode ? 'text-[#ff6b35]' : 'text-[#1a1a1a]'}`}>{gridAngle}°</span>
                    </div>
                  </div>
                )}

                {style !== 'cmyk' && (style !== 'upscale' || colorMode === 'color') && (
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <input
                        type="color"
                        className="h-7 w-9 cursor-pointer border-0 p-0 rounded-none appearance-none"
                        value={dotColor}
                        onChange={(e) => setDotColor(e.target.value)}
                      />
                      <div className="absolute inset-0 border-2 border-[#1a1a1a] pointer-events-none" />
                    </div>
                    <span className={`text-xs font-bold font-mono ${darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/70'}`}>{dotColor.toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="flex-1 min-h-0 animate-slide-up stagger-5 pb-32">
            <div className={`${darkMode ? 'bg-[#1a1a1a]' : 'bg-white'} border-3 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] p-2 h-full flex flex-col relative`}>
              {/* Decorative corner accents */}
              <div className="absolute top-0 left-0 w-8 h-8 overflow-hidden">
                <div className="absolute top-2 left-2 w-full h-full bg-[#ff6b35] transform -translate-y-full" />
              </div>
              <div className="absolute bottom-0 right-0 w-8 h-8 overflow-hidden">
                <div className="absolute bottom-2 right-2 w-full h-full bg-[#ff6eb4] transform translate-y-full" />
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className={`text-base font-bold flex items-center gap-2 ${darkMode ? 'text-[#faf8f3]' : 'text-[#1a1a1a]'}`} style={{ fontFamily: 'var(--font-display)' }}>
                    <div className="w-2 h-2 bg-[#ff6b35]" />
                    <div className="w-2 h-2 bg-[#ff6eb4]" />
                    <div className="w-2 h-2 bg-[#6b9bd2]" />
                    <span>PREVIEW</span>
                  </h3>
                  {image && (() => {
                    // Calculate pages based on layout mode
                    let displayPagesWide: number;
                    let displayPagesHigh: number;

                    if (layoutMode === 'wallSpace') {
                      const wallW = parseFloat(wallWidth) || 0;
                      const wallH = parseFloat(wallHeight) || 0;
                      const pages = calculatePagesFromWall(wallW, wallH);
                      displayPagesWide = pages.pagesWide;
                      displayPagesHigh = pages.pagesHigh;
                    } else {
                      displayPagesWide = pagesWide;
                      displayPagesHigh = pagesHigh;
                    }

                    // Calculate wall dimensions from pages
                    const wallDims = calculateWallFromPages(displayPagesWide, displayPagesHigh);

                    // Format wall dimensions based on unit
                    const unitLabel = wallUnit === 'imperial' ? 'ft' : 'mm';
                    const formattedWidth = wallUnit === 'imperial' ? wallDims.width.toFixed(1) : wallDims.width.toFixed(0);
                    const formattedHeight = wallUnit === 'imperial' ? wallDims.height.toFixed(1) : wallDims.height.toFixed(0);

                    return (
                      <span className={`text-xs font-bold font-mono ${darkMode ? 'text-[#ff6b35]' : 'text-[#1a1a1a]/70'}`}>
                        {displayPagesWide} × {displayPagesHigh} pages ({formattedWidth} × {formattedHeight} {unitLabel})
                      </span>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-1">
                  {image && (
                    <button
                      onClick={() => {
                        setImage(null);
                        setZoom(1);
                        setPan({ x: 0, y: 0 });
                      }}
                      className={`text-xs font-bold uppercase tracking-wide bg-[#ff6b35] hover:bg-[#ff6b35]/90 text-white px-1.5 py-1 border border-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all`}
                    >
                      START OVER
                    </button>
                  )}
                  {image && (
                    <div className="flex items-center gap-0 border border-[#1a1a1a]">
                      <button
                        onClick={handleZoomOut}
                        className={`p-1.5 transition-colors ${darkMode ? 'hover:bg-[#333] text-[#999] hover:text-white' : 'hover:bg-[#f5f0e6] text-[#1a1a1a]/50 hover:text-[#1a1a1a]'}`}
                        title="Zoom out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className={`text-xs font-bold font-mono min-w-[3.5rem] text-center ${darkMode ? 'text-[#ff6b35]' : 'text-[#1a1a1a]'}`}>{Math.round(zoom * 100)}%</span>
                      <button
                        onClick={handleZoomIn}
                        className={`p-1.5 transition-colors ${darkMode ? 'hover:bg-[#333] text-[#999] hover:text-white' : 'hover:bg-[#f5f0e6] text-[#1a1a1a]/50 hover:text-[#1a1a1a]'}`}
                        title="Zoom in"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleResetZoom}
                        className={`p-1.5 transition-colors ${darkMode ? 'hover:bg-[#333] text-[#999] hover:text-white' : 'hover:bg-[#f5f0e6] text-[#1a1a1a]/50 hover:text-[#1a1a1a]'}`}
                        title="Reset zoom"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div
                ref={previewContainerRef}
                className={`flex-1 border-3 border-[#1a1a1a] flex items-center justify-center p-1.5 overflow-hidden min-h-[300px] ${image ? 'cursor-grab active:cursor-grabbing' : ''} ${darkMode ? 'bg-[#0f0f0f]' : 'bg-[#f5f0e6]'}`}
                onWheel={handleWheel}
                onMouseDown={handlePanStart}
                onMouseMove={handlePanMove}
                onMouseUp={handlePanEnd}
                onMouseLeave={handlePanEnd}
              >
                {!image ? (
                  <div
                    className={`relative flex flex-col items-center justify-center w-full h-full border-3 border-dashed rounded-none transition-all duration-200 cursor-pointer ${isDragging ? 'border-[#ff6b35] bg-[#ff6b35]/10 scale-[1.02]' : darkMode ? 'border-[#333] bg-[#1a1a1a]/50 hover:bg-[#1a1a1a]' : 'border-[#1a1a1a]/30 bg-[#f5f0e6]/50 hover:bg-[#f5f0e6]'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {/* Privacy Tape Badge */}
                    <PrivacyTapeBadge />

                    <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                      {/* Bulls-eye target */}
                      <div className="relative mb-6">
                        {/* Outer ring */}
                        <div className="w-48 h-48 rounded-full border-4 border-[#ff6b35] flex items-center justify-center animate-pulse">
                          {/* Middle ring */}
                          <div className="w-32 h-32 rounded-full border-4 border-[#ff6eb4] flex items-center justify-center">
                            {/* Inner ring */}
                            <div className="w-16 h-16 rounded-full bg-[#6b9bd2] flex items-center justify-center">
                              <Target className="w-8 h-8 text-white" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Playful copy */}
                      <p className={`text-2xl font-bold mb-3 transition-colors ${isDragging ? 'text-[#ff6b35]' : darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/80'}`}>
                        DROP YOUR PHOTO RIGHT HERE!
                      </p>
                      <p className={`text-lg mb-2 transition-colors ${isDragging ? 'text-[#ff6b35]' : darkMode ? 'text-[#666]' : 'text-[#1a1a1a]/60'}`}>
                        Let's make a GIANT poster! 🖼️
                      </p>
                      <p className={`text-sm transition-colors ${isDragging ? 'text-[#ff6b35]' : darkMode ? 'text-[#555]' : 'text-[#1a1a1a]/40'}`}>
                        Or <span className="underline underline-offset-1 decoration-2 decoration-[#ff6b35] font-bold">tap to browse</span>
                      </p>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        loadSampleImage();
                      }}
                      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#ffbe0b] hover:bg-[#ffbe0b]/90 text-[#1a1a1a] font-bold px-4 py-2 border-3 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[calc(-50%+2px)] hover:translate-y-[2px] transition-all"
                    >
                      <FileImage className="w-4 h-4" />
                      <span>TRY THE SAMPLE POSTER</span>
                    </button>
                  </div>
                ) : (
                  <div
                    className="transition-transform duration-75 ease-out shadow-lg border-4 border-[#1a1a1a] bg-white"
                    style={{
                      transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                      cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default'
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      className="block"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Fixed Output Bar - Always visible at bottom */}
        <div className={`fixed bottom-0 left-0 right-0 ${darkMode ? 'bg-[#1a1a1a]' : 'bg-white'} border-t-4 border-[#1a1a1a] shadow-[0_-4px_0px_0px_rgba(26,26,26,1)] z-40`}>
          <div className="max-w-7xl mx-auto px-3 py-2 flex flex-col xl:flex-row items-center gap-3">
            {/* Left: Heading and Options */}
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 border-2 border-[#1a1a1a] flex items-center justify-center font-bold text-xs transition-all duration-300 shrink-0 ${hasUploaded ? 'bg-[#6b9bd2] text-white' : 'bg-white text-[#999]'}`}>3</div>
                <h3 className={`text-base font-bold transition-all duration-300 ${hasUploaded ? darkMode ? 'text-[#faf8f3]' : 'text-[#1a1a1a]' : darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/40'}`} style={{ fontFamily: 'var(--font-display)' }}>
                  {hasUploaded ? 'MAKE IT HAPPEN!' : 'OUTPUT'}
                </h3>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={cropMarks}
                      onChange={(e) => setCropMarks(e.target.checked)}
                    />
                    <div className={`w-4 h-4 border-2 border-[#1a1a1a] bg-white peer-checked:bg-[#ff6b35] transition-colors flex items-center justify-center`}>
                      {cropMarks && <span className="text-white text-[10px] font-bold">✓</span>}
                    </div>
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wide ${darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/70'}`}>Add crop marks for easy cutting ✂️</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={skipBlankPages}
                      onChange={(e) => setSkipBlankPages(e.target.checked)}
                    />
                    <div className={`w-4 h-4 border-2 border-[#1a1a1a] bg-white peer-checked:bg-[#ff6eb4] transition-colors flex items-center justify-center`}>
                      {skipBlankPages && <span className="text-white text-[10px] font-bold">✓</span>}
                    </div>
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wide ${darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/70'}`}>Skip empty pages (saves paper!) 📄</span>
                </label>

                {skipBlankPages && preserveAspectRatio && image && (() => {
                  const math = getLayoutMath();
                  const totalPages = pagesWide * pagesHigh;
                  const pagesWithContent = math.contentPages?.size || totalPages;
                  const pagesSkipped = totalPages - pagesWithContent;
                  if (pagesSkipped > 0) {
                    return (
                      <div className={`px-2 py-1 border-2 border-[#1a1a1a] ${darkMode ? 'bg-[#1a1a1a]/30' : 'bg-[#f5f0e6]/50'}`}>
                        <p className={`text-[10px] font-bold ${darkMode ? 'text-[#ff6eb4]' : 'text-[#1a1a1a]/70'}`}>
                          Skip {pagesSkipped} blank page{pagesSkipped !== 1 ? 's' : ''}
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}

                {status && (
                  <p className={`text-xs font-bold ${status.includes('Error') ? 'text-[#e63946]' : 'text-[#69be28]'}`}>
                    {status}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Generate Button */}
            <div className="shrink-0">
              <button
                onClick={generatePDF}
                disabled={!image || isGenerating}
                className="btn-riso flex items-center justify-center gap-2 bg-[#ff6b35] hover:bg-[#ff6b35]/90 text-white font-bold py-2.5 px-6 border-3 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:from-[#999] disabled:to-[#888] disabled:shadow-none disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0"
              >
                {isGenerating ? (
                  <>
                    <span>✨</span>
                    <span>Making magic...</span>
                  </>
                ) : generationComplete ? (
                  <>
                    <span>✅</span>
                    <span>YOU DID IT!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>DOWNLOAD YOUR GIANT POSTER 📥</span>
                  </>
                )}
              </button>
              <Confetti trigger={generationComplete} />
            </div>
            {generationComplete && (
              <button
                onClick={() => {
                  setImage(null);
                  setHasUploaded(false);
                  setGenerationComplete(false);
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                  setStatus('');
                }}
                className="flex items-center justify-center gap-2 bg-white hover:bg-[#f5f0e6] text-[#1a1a1a] font-bold py-2.5 px-6 border-3 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>MAKE ANOTHER</span>
              </button>
            )}
          </div>
        </div>

        {/* Floating Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`fixed top-4 right-4 p-2 border-2 border-[#1a1a1a] transition-all duration-200 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] hover:shadow-[1.5px_1.5px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[1.5px] hover:translate-y-[1.5px] z-50 ${darkMode ? 'bg-[#1a1a1a] hover:bg-[#ff6b35]' : 'bg-white hover:bg-[#ff6b35]'}`}
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun className="w-5 h-5 text-[#ff6b35]" /> : <Moon className="w-5 h-5 text-[#1a1a1a]" />}
        </button>

        {/* Footer */}
        <div className={`fixed bottom-28 right-4 text-[10px] font-mono ${darkMode ? 'text-[#666]' : 'text-[#1a1a1a]/50'}`}>
          v0.7.0
        </div>
      </div>
    </div>
  );
}
