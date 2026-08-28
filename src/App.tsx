import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { FileImage, Download, Sun, Moon, ZoomIn, ZoomOut, RotateCcw, Target } from 'lucide-react';
import { StyleTipBox, Stamp, PrivacyTapeBadge } from './components';

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

// Rendering cost grows with the page grid, so dimensions are clamped in JS
// (the HTML min/max attributes alone do not stop typed input)
const MAX_PAGES_PER_SIDE = 100;

const clampPages = (value: string) => Math.min(MAX_PAGES_PER_SIDE, Math.max(1, parseInt(value) || 1));

const clampDotSize = (value: string) => Math.min(50, Math.max(2, parseFloat(value) || 2));

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

  // React attaches onWheel as a passive listener, where preventDefault() is a
  // no-op, so the wheel listener is attached natively with passive: false.
  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.max(0.25, Math.min(10, prev * delta)));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

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

  // Calculate optimal pages from wall dimensions. Paper and orientation can be
  // passed explicitly when recalculating in response to a change that React
  // state has not applied yet.
  const calculatePagesFromWall = (
    wallWidth: number,
    wallHeight: number,
    forPaper: 'letter' | 'a4' = paperSize,
    forOrientation: 'portrait' | 'landscape' = orientation
  ) => {
    let pWidth = paperDims[forPaper].width;
    let pHeight = paperDims[forPaper].height;

    if (forOrientation === 'landscape') {
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
      pagesWide: Math.min(100, Math.max(1, calculatedPagesWide)),
      pagesHigh: Math.min(100, Math.max(1, calculatedPagesHigh))
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
                  // Deterministic random based on position; offsets are scaled by
                  // a full dotSize to match the PDF renderer
                  const seed = (gridX * 73856093 + gridY * 19349663) % 2147483647;

                  const numDots = Math.floor(darkness * 3) + 1;
                  for (let d = 0; d < numDots; d++) {
                    const dotSeed = seed * (d + 1) * 69069;
                    const dx = ((dotSeed * 8255) % 2147483647) / 2147483647 - 0.5;
                    const dy = ((dotSeed * 12345) % 2147483647) / 2147483647 - 0.5;
                    const stippleRadius = (previewDotMaxRadius * darkness) * (0.5 + ((dotSeed * 6907) % 2147483647) / 2147483647 * 0.5);
                    ctx.beginPath();
                    ctx.arc(dx * math.dotSize * scale, dy * math.dotSize * scale, stippleRadius, 0, Math.PI * 2);
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
  }, [image, paperSize, orientation, pagesWide, pagesHigh, dotSize, dotColor, style, gridAngle, colorMode, preserveAspectRatio]);

  const generatePDF = () => {
    if (!image) return;

    setIsGenerating(true);
    setStatus('Ruling up pages...');
    const statusTimer1 = setTimeout(() => setStatus('Laying out the dots...'), 1000);
    const statusTimer2 = setTimeout(() => setStatus('Lining up the tiles...'), 2000);

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
        clearTimeout(statusTimer1);
        clearTimeout(statusTimer2);
        setStatus('Downloaded! Your photo never left your computer.');
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
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-[#191512]' : 'bg-paper'}`}>
      {/* Paper texture overlay */}
      <div className="fixed inset-0 paper-texture pointer-events-none z-50" />
      <div className="fixed inset-0 halftone-overlay pointer-events-none z-50" />

      <div className="max-w-7xl mx-auto px-3 pt-2 lg:pt-3 relative z-10 min-h-screen flex flex-col xl:flex-row gap-3 pb-40">
        {/* Left Column - Header + Controls */}
        <div className="w-full xl:w-[320px] flex flex-col flex-shrink-0 space-y-2 pb-32 xl:pb-0">
          {/* Header */}
          <header className="animate-slide-up">
            <div className="relative">
              <div className="bg-sheet border border-line rounded-2xl p-4 shadow-sheet relative">
                <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-ink" style={{ fontFamily: 'var(--font-display)' }}>
                  Print It Huge
                </h1>
                <div className="mt-2 flex items-center gap-1">
                  <div className="h-0.5 flex-1 rounded-full bg-accent" />
                  <div className="h-0.5 flex-1 rounded-full bg-blush" />
                  <div className="h-0.5 flex-1 rounded-full bg-sky" />
                </div>
                <p className="mt-1.5 text-sm text-ink-soft">
                  Turn any image into a wall-size poster — on the printer you already own.
                </p>
              </div>
            </div>
          </header>

          {/* Controls Panel */}
          <div className="w-full space-y-2 animate-slide-up stagger-1">
            {/* Unified Layout Section */}
            <div className={`${darkMode ? 'bg-[#211c17]' : 'bg-sheet'} border border-line rounded-2xl shadow-sheet p-4 animate-slide-up stagger-1 transition-all duration-300 ${hasUploaded ? 'opacity-100' : 'opacity-30'}`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-semibold transition-all duration-300 shrink-0 ${hasUploaded ? 'bg-accent text-white' : darkMode ? 'bg-[#2a241e] text-[#a1988c]' : 'bg-paper text-ink-soft'}`}>1</div>
                <h3 className={`text-lg font-bold tracking-tight transition-all duration-300 ${hasUploaded ? darkMode ? 'text-[#f0e9dd]' : 'text-ink' : darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`} style={{ fontFamily: 'var(--font-display)' }}>
                  {hasUploaded ? 'How big should it go?' : 'Layout'}
                </h3>
              </div>

              <div className="space-y-2">
                {/* Mode Toggle */}
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>
                    Calculate by:
                  </label>
                  <select
                    className={`w-full rounded-lg border p-2 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-accent/25 focus:border-accent ${darkMode ? 'bg-[#2a241e] border-[#3a332b] text-[#f0e9dd]' : 'bg-white border-line text-ink'}`}
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
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>Paper Format</label>
                  <select
                    className={`w-full rounded-lg border p-2 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-accent/25 focus:border-accent ${darkMode ? 'bg-[#2a241e] border-[#3a332b] text-[#f0e9dd]' : 'bg-white border-line text-ink'}`}
                    value={paperSize}
                    onChange={(e) => {
                      const newSize = e.target.value as 'letter' | 'a4';
                      setPaperSize(newSize);

                      // Keep the page grid in sync with the wall dimensions when
                      // the paper format changes in Wall Space mode
                      if (layoutMode === 'wallSpace') {
                        const wallW = parseFloat(wallWidth) || 0;
                        const wallH = parseFloat(wallHeight) || 0;
                        if (wallW > 0 && wallH > 0) {
                          const pages = calculatePagesFromWall(wallW, wallH, newSize);
                          setPagesWide(pages.pagesWide);
                          setPagesHigh(pages.pagesHigh);
                        }
                      }
                    }}
                  >
                    <option value="letter">US Letter (8.5" x 11")</option>
                    <option value="a4">A4 (210mm x 297mm)</option>
                  </select>
                </div>

                {/* Orientation */}
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>Orientation</label>
                  <select
                    className={`w-full rounded-lg border p-2 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-accent/25 focus:border-accent ${darkMode ? 'bg-[#2a241e] border-[#3a332b] text-[#f0e9dd]' : 'bg-white border-line text-ink'}`}
                    value={orientation}
                    onChange={(e) => {
                      const newOrientation = e.target.value as 'portrait' | 'landscape';
                      setOrientation(newOrientation);

                      // Keep the page grid in sync with the wall dimensions when
                      // the orientation changes in Wall Space mode
                      if (layoutMode === 'wallSpace') {
                        const wallW = parseFloat(wallWidth) || 0;
                        const wallH = parseFloat(wallHeight) || 0;
                        if (wallW > 0 && wallH > 0) {
                          const pages = calculatePagesFromWall(wallW, wallH, paperSize, newOrientation);
                          setPagesWide(pages.pagesWide);
                          setPagesHigh(pages.pagesHigh);
                        }
                      }
                    }}
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
                      <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>Measurement Unit</label>
                      <select
                        className={`w-full rounded-lg border p-2 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-accent/25 focus:border-accent ${darkMode ? 'bg-[#2a241e] border-[#3a332b] text-[#f0e9dd]' : 'bg-white border-line text-ink'}`}
                        value={wallUnit}
                        onChange={(e) => setWallUnit(e.target.value as 'imperial' | 'metric')}
                      >
                        <option value="imperial">Imperial (feet)</option>
                        <option value="metric">Metric (mm)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>
                          Width ({wallUnit === 'imperial' ? 'ft' : 'mm'})
                        </label>
                        <input
                          type="number"
                          min="0.1" step="0.1"
                          placeholder={wallUnit === 'imperial' ? '4' : '1200'}
                          className={`w-full rounded-lg border p-2 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-accent/25 focus:border-accent ${darkMode ? 'bg-[#2a241e] border-[#3a332b] text-[#f0e9dd]' : 'bg-white border-line text-ink'}`}
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
                        <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>
                          Height ({wallUnit === 'imperial' ? 'ft' : 'mm'})
                        </label>
                        <input
                          type="number"
                          min="0.1" step="0.1"
                          placeholder={wallUnit === 'imperial' ? '7' : '2100'}
                          className={`w-full rounded-lg border p-2 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-accent/25 focus:border-accent ${darkMode ? 'bg-[#2a241e] border-[#3a332b] text-[#f0e9dd]' : 'bg-white border-line text-ink'}`}
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
                      <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>Pages Wide</label>
                      <input
                        type="number"
                        min="1"
                        max={MAX_PAGES_PER_SIDE}
                        className={`w-full rounded-lg border p-2 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-accent/25 focus:border-accent ${darkMode ? 'bg-[#2a241e] border-[#3a332b] text-[#f0e9dd]' : 'bg-white border-line text-ink'}`}
                        value={pagesWide}
                        onChange={(e) => setPagesWide(clampPages(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>Pages High</label>
                      <input
                        type="number"
                        min="1"
                        max={MAX_PAGES_PER_SIDE}
                        className={`w-full rounded-lg border p-2 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-accent/25 focus:border-accent ${darkMode ? 'bg-[#2a241e] border-[#3a332b] text-[#f0e9dd]' : 'bg-white border-line text-ink'}`}
                        value={pagesHigh}
                        onChange={(e) => setPagesHigh(clampPages(e.target.value))}
                      />
                    </div>
                  </div>
                )}

                {/* Info Box - Shows conversion results */}
                <div className={`rounded-xl border p-3 ${darkMode ? 'border-[#3a332b] bg-white/5' : 'border-line bg-paper/70'}`}>
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
                          <p className="text-xs font-semibold mb-1 text-[#c0452f]">
                            Heads up: this will create 1000+ pages
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
                                <div className={`rounded-lg p-1.5 text-center border ${darkMode ? 'border-[#3a332b] bg-white/5' : 'border-line bg-sheet'}`}>
                                  <div className={`text-[11px] font-medium ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>Wide</div>
                                  <div className={`text-xl font-bold ${darkMode ? 'text-accent' : 'text-ink'}`}>
                                    {pages.pagesWide}
                                  </div>
                                </div>
                                <div className={`rounded-lg p-1.5 text-center border ${darkMode ? 'border-[#3a332b] bg-white/5' : 'border-line bg-sheet'}`}>
                                  <div className={`text-[11px] font-medium ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>High</div>
                                  <div className={`text-xl font-bold ${darkMode ? 'text-accent' : 'text-ink'}`}>
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
                                <div className={`text-[11px] font-medium ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>Wall size</div>
                                <div className={`text-sm font-bold ${darkMode ? 'text-accent' : 'text-ink'}`}>
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

                {/* Preserve aspect ratio */}
                <div className={`rounded-xl border p-3 ${darkMode ? 'border-[#3a332b] bg-white/5' : 'border-line bg-paper/70'}`}>
                  <label className="flex items-center gap-2 cursor-pointer mb-1">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={preserveAspectRatio}
                        onChange={(e) => setPreserveAspectRatio(e.target.checked)}
                      />
                      <div className={`w-4 h-4 rounded border border-line-strong bg-white peer-checked:bg-sky peer-checked:border-sky transition-colors flex items-center justify-center`}>
                        {preserveAspectRatio && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                    </div>
                    <span className={`text-xs font-medium ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>Preserve aspect ratio</span>
                  </label>
                  {image && preserveAspectRatio && (
                    <button
                      onClick={fitToAspectRatio}
                      className="w-full py-1.5 px-2 text-xs font-semibold bg-sky hover:bg-sky/90 text-white rounded-lg shadow-sm hover:shadow transition-all"
                    >
                      Fit to image
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Style Section */}
            <div className={`${darkMode ? 'bg-[#211c17]' : 'bg-sheet'} border border-line rounded-2xl shadow-sheet p-4 animate-slide-up stagger-3 transition-all duration-300 ${hasUploaded ? 'opacity-100' : 'opacity-30'}`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-semibold transition-all duration-300 ${hasUploaded ? 'bg-blush text-white' : darkMode ? 'bg-[#2a241e] text-[#a1988c]' : 'bg-paper text-ink-soft'}`}>2</div>
                <h3 className={`text-lg font-bold tracking-tight transition-all duration-300 ${hasUploaded ? darkMode ? 'text-[#f0e9dd]' : 'text-ink' : darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`} style={{ fontFamily: 'var(--font-display)' }}>
                  {hasUploaded ? 'Pick a style' : 'Style'}
                </h3>
              </div>

              <div className="space-y-1.5">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>Pattern</label>
                  <select
                    className={`w-full rounded-lg border p-2 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-accent/25 focus:border-accent ${darkMode ? 'bg-[#2a241e] border-[#3a332b] text-[#f0e9dd]' : 'bg-white border-line text-ink'}`}
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
                    <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>
                      Color Mode
                    </label>
                    <select
                      className={`w-full rounded-lg border p-2 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-accent/25 focus:border-accent ${darkMode ? 'bg-[#2a241e] border-[#3a332b] text-[#f0e9dd]' : 'bg-white border-line text-ink'}`}
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
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>Dot Size (mm)</label>
                  <input
                    type="number"
                    min="2" max="50"
                    className={`w-full rounded-lg border p-2 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-accent/25 focus:border-accent ${darkMode ? 'bg-[#2a241e] border-[#3a332b] text-[#f0e9dd]' : 'bg-white border-line text-ink'}`}
                    value={dotSize}
                    onChange={(e) => setDotSize(clampDotSize(e.target.value))}
                  />
                </div>

                {style !== 'dither' && style !== 'cmyk' && style !== 'upscale' && (
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>Angle</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="range"
                        min="0" max="90"
                        className="flex-1 h-1.5 rounded-full bg-line appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm"
                        value={gridAngle}
                        onChange={(e) => setGridAngle(parseInt(e.target.value) || 0)}
                      />
                      <span className={`text-xs font-semibold font-mono w-8 text-right ${darkMode ? 'text-accent' : 'text-ink'}`}>{gridAngle}°</span>
                    </div>
                  </div>
                )}

                {style !== 'cmyk' && (style !== 'upscale' || colorMode === 'color') && (
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <input
                        type="color"
                        className="h-7 w-9 cursor-pointer border-0 p-0 rounded-md appearance-none"
                        value={dotColor}
                        onChange={(e) => setDotColor(e.target.value)}
                      />
                      <div className="absolute inset-0 rounded-md border border-line-strong pointer-events-none" />
                    </div>
                    <span className={`text-xs font-bold font-mono ${darkMode ? 'text-[#999]' : 'text-[#1a1a1a]/70'}`}>{dotColor.toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="flex-1 min-h-0 animate-slide-up stagger-5 pb-28 xl:pb-0 xl:sticky xl:top-3 xl:h-[calc(100vh-6.5rem)]">
            <div className={`${darkMode ? 'bg-[#211c17]' : 'bg-sheet'} border border-line rounded-2xl shadow-sheet p-3 h-full flex flex-col relative`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-[#f0e9dd]' : 'text-ink'}`} style={{ fontFamily: 'var(--font-display)' }}>
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <div className="w-2 h-2 rounded-full bg-blush" />
                    <div className="w-2 h-2 rounded-full bg-sky" />
                    <span>Preview</span>
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
                      <span className={`text-xs font-semibold font-mono ${darkMode ? 'text-accent' : 'text-ink-soft'}`}>
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
                      className={`text-xs font-semibold bg-accent hover:bg-accent-deep text-white px-2.5 py-1 rounded-full shadow-sm transition-all`}
                    >
                      Start over
                    </button>
                  )}
                  {image && (
                    <div className="flex items-center rounded-full border border-line shadow-sheet overflow-hidden">
                      <button
                        onClick={handleZoomOut}
                        className={`p-1.5 transition-colors ${darkMode ? 'hover:bg-[#2a241e] text-[#a1988c] hover:text-white' : 'hover:bg-paper text-ink-soft hover:text-ink'}`}
                        title="Zoom out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className={`text-xs font-semibold font-mono min-w-[3.5rem] text-center ${darkMode ? 'text-accent' : 'text-ink'}`}>{Math.round(zoom * 100)}%</span>
                      <button
                        onClick={handleZoomIn}
                        className={`p-1.5 transition-colors ${darkMode ? 'hover:bg-[#2a241e] text-[#a1988c] hover:text-white' : 'hover:bg-paper text-ink-soft hover:text-ink'}`}
                        title="Zoom in"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleResetZoom}
                        className={`p-1.5 transition-colors ${darkMode ? 'hover:bg-[#2a241e] text-[#a1988c] hover:text-white' : 'hover:bg-paper text-ink-soft hover:text-ink'}`}
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
                className={`flex-1 rounded-xl border flex items-center justify-center p-2 overflow-hidden min-h-[300px] ${image ? 'cursor-grab active:cursor-grabbing' : ''} ${darkMode ? 'border-[#3a332b] bg-[#191512]' : 'border-line bg-paper'}`}
                onMouseDown={handlePanStart}
                onMouseMove={handlePanMove}
                onMouseUp={handlePanEnd}
                onMouseLeave={handlePanEnd}
              >
                {!image ? (
                  <div
                    className={`relative flex flex-col items-center justify-center w-full h-full rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer ${isDragging ? 'border-accent bg-accent/5 scale-[1.01]' : darkMode ? 'border-[#3a332b] bg-white/[0.03] hover:bg-white/[0.05]' : 'border-line-strong bg-paper/60 hover:bg-paper'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {/* Animated cut line */}
                    <svg aria-hidden="true" className="pointer-events-none absolute inset-2 h-[calc(100%-16px)] w-[calc(100%-16px)]">
                      <rect
                        className="ants-rect"
                        x="1"
                        y="1"
                        fill="none"
                        stroke={isDragging ? '#e85d2f' : darkMode ? '#3a332b' : '#c9bca6'}
                        strokeWidth="1.5"
                        strokeDasharray="10 6"
                        rx="14"
                        style={{ width: 'calc(100% - 2px)', height: 'calc(100% - 2px)' }}
                      />
                    </svg>

                    {/* Privacy stamp */}
                    <PrivacyTapeBadge />

                    <label className="flex flex-1 flex-col items-center justify-center w-full min-h-0 cursor-pointer px-6 text-center">
                      {/* Bullseye */}
                      <div className="relative mb-5">
                        <div
                          className="flex h-24 w-24 items-center justify-center rounded-full bg-accent/10 transition-transform duration-300"
                          style={{ transform: isDragging ? 'scale(1.08)' : undefined }}
                        >
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white shadow-lift">
                            <Target className="h-8 w-8" />
                          </div>
                        </div>
                      </div>

                      <p className={`text-2xl font-bold tracking-tight mb-2 transition-colors ${isDragging ? 'text-accent' : darkMode ? 'text-[#f0e9dd]' : 'text-ink'}`}>
                        Drop a photo. Get a giant poster.
                      </p>
                      <p className={`text-sm max-w-md mb-3 transition-colors ${isDragging ? 'text-accent' : darkMode ? 'text-[#8d8375]' : 'text-ink-soft'}`}>
                        Any image gets sliced into printer-friendly pages — trim, tape them together, and suddenly: wall art.
                      </p>
                      <p className={`text-sm transition-colors ${isDragging ? 'text-accent' : darkMode ? 'text-[#6b6156]' : 'text-ink-soft/80'}`}>
                        Or <span className="underline underline-offset-2 decoration-2 decoration-accent/60 font-semibold">browse your files</span>
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
                      className="mb-6 flex items-center gap-2 bg-sheet hover:bg-white text-ink font-semibold text-sm px-4 py-2 rounded-full border border-line shadow-sheet hover:shadow-lift hover:-translate-y-0.5 transition-all"
                    >
                      <FileImage className="w-4 h-4 text-accent" />
                      <span>No photo handy? Try ours</span>
                    </button>
                  </div>
                ) : (
                  <div
                    className="transition-transform duration-75 ease-out shadow-lift rounded-md bg-white ring-1 ring-line"
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
        <div className={`fixed bottom-0 left-0 right-0 z-40 border-t ${darkMode ? 'border-[#3a332b] bg-[#211c17]' : 'border-line bg-sheet'} shadow-[0_-8px_24px_rgba(33,29,25,0.08)]`}>
          <div className="max-w-7xl mx-auto px-3 py-2 flex flex-col xl:flex-row items-center gap-3">
            {/* Left: Heading and Options */}
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-semibold transition-all duration-300 shrink-0 ${hasUploaded ? 'bg-sky text-white' : darkMode ? 'bg-[#2a241e] text-[#a1988c]' : 'bg-paper text-ink-soft'}`}>3</div>
                <h3 className={`text-lg font-bold tracking-tight transition-all duration-300 ${hasUploaded ? darkMode ? 'text-[#f0e9dd]' : 'text-ink' : darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`} style={{ fontFamily: 'var(--font-display)' }}>
                  {hasUploaded ? 'Print it' : 'Output'}
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
                    <div className={`w-4 h-4 rounded border border-line-strong bg-white peer-checked:bg-accent peer-checked:border-accent transition-colors flex items-center justify-center`}>
                      {cropMarks && <span className="text-white text-[10px] font-bold">✓</span>}
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>Crop marks for easy trimming</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={skipBlankPages}
                      onChange={(e) => setSkipBlankPages(e.target.checked)}
                    />
                    <div className={`w-4 h-4 rounded border border-line-strong bg-white peer-checked:bg-blush peer-checked:border-blush transition-colors flex items-center justify-center`}>
                      {skipBlankPages && <span className="text-white text-[10px] font-bold">✓</span>}
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>Skip blank pages (saves paper)</span>
                </label>

                {skipBlankPages && preserveAspectRatio && image && (() => {
                  const math = getLayoutMath();
                  const totalPages = pagesWide * pagesHigh;
                  const pagesWithContent = math.contentPages?.size || totalPages;
                  const pagesSkipped = totalPages - pagesWithContent;
                  if (pagesSkipped > 0) {
                    return (
                      <div className={`px-2.5 py-1 rounded-lg border ${darkMode ? 'border-[#3a332b] bg-white/5' : 'border-line bg-paper/70'}`}>
                        <p className={`text-xs font-semibold ${darkMode ? 'text-blush' : 'text-ink-soft'}`}>
                          Skip {pagesSkipped} blank page{pagesSkipped !== 1 ? 's' : ''}
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}

                {status && (
                  <p className={`text-xs font-semibold ${status.includes('Error') ? 'text-[#c0452f]' : 'text-moss'}`}>
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
                className="flex items-center justify-center gap-2 rounded-full bg-accent hover:bg-accent-deep text-white font-semibold py-3 px-7 shadow-lift transition-all hover:-translate-y-0.5 disabled:bg-line-strong disabled:text-ink-soft disabled:shadow-none disabled:cursor-not-allowed disabled:translate-y-0"
              >
                {isGenerating ? (
                  <>
                    <span>✨</span>
                    <span>Ruling up pages…</span>
                  </>
                ) : generationComplete ? (
                  <>
                    <span>✓</span>
                    <span>Ready to print!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Make it huge</span>
                  </>
                )}
              </button>
              <Stamp trigger={generationComplete} />
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
                className="flex items-center justify-center gap-2 rounded-full border border-line bg-sheet hover:bg-paper text-ink font-semibold py-3 px-6 shadow-sheet hover:shadow-lift transition-all hover:-translate-y-0.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Make another</span>
              </button>
            )}
          </div>
        </div>

        {/* Floating Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`fixed top-4 right-4 z-50 rounded-full border p-2.5 shadow-sheet transition-all hover:shadow-lift hover:-translate-y-0.5 ${darkMode ? 'border-[#3a332b] bg-[#2a241e] hover:bg-accent' : 'border-line bg-sheet hover:bg-accent'}`}
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun className="w-5 h-5 text-accent" /> : <Moon className="w-5 h-5 text-ink" />}
        </button>

        {/* Footer */}
        <div className={`fixed bottom-28 right-4 text-[10px] font-mono ${darkMode ? 'text-[#666]' : 'text-[#1a1a1a]/50'}`}>
          v0.7.0
        </div>
      </div>
    </div>
  );
}
