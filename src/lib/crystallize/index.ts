// Crystallization - Pixelation and Export
import { HSLColor, CrystallizedImage } from '@/types';

// Posterize/quantize colors to a limited palette
export function quantizeColor(color: HSLColor, levels: number = 8): HSLColor {
  const hueStep = 360 / levels;
  const satStep = 100 / levels;
  const lightStep = 100 / levels;
  
  return {
    h: Math.round(color.h / hueStep) * hueStep,
    s: Math.round(color.s / satStep) * satStep,
    l: Math.round(color.l / lightStep) * lightStep,
    a: Math.round(color.a * levels) / levels,
  };
}

// Extract dominant palette from canvas
export function extractPalette(
  imageData: ImageData,
  paletteSize: number = 8
): HSLColor[] {
  const colorCounts: Map<string, { color: HSLColor; count: number }> = new Map();
  const data = imageData.data;
  
  // Sample pixels
  for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3] / 255;
    
    if (a < 0.1) continue; // Skip transparent
    
    const hsl = rgbToHsl(r, g, b);
    hsl.a = a;
    
    // Quantize for grouping
    const quantized = quantizeColor(hsl, 12);
    const key = `${quantized.h}-${quantized.s}-${quantized.l}`;
    
    if (colorCounts.has(key)) {
      colorCounts.get(key)!.count++;
    } else {
      colorCounts.set(key, { color: quantized, count: 1 });
    }
  }
  
  // Sort by count and return top colors
  const sorted = Array.from(colorCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, paletteSize)
    .map(item => item.color);
  
  return sorted;
}

// RGB to HSL conversion
function rgbToHsl(r: number, g: number, b: number): HSLColor {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    a: 1,
  };
}

// Pixelate image data
export function pixelate(
  imageData: ImageData,
  pixelSize: number = 4
): ImageData {
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  
  for (let y = 0; y < height; y += pixelSize) {
    for (let x = 0; x < width; x += pixelSize) {
      // Average color in block
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      
      for (let py = 0; py < pixelSize && y + py < height; py++) {
        for (let px = 0; px < pixelSize && x + px < width; px++) {
          const i = ((y + py) * width + (x + px)) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          a += data[i + 3];
          count++;
        }
      }
      
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);
      a = Math.round(a / count);
      
      // Fill block with averaged color
      for (let py = 0; py < pixelSize && y + py < height; py++) {
        for (let px = 0; px < pixelSize && x + px < width; px++) {
          const i = ((y + py) * width + (x + px)) * 4;
          result.data[i] = r;
          result.data[i + 1] = g;
          result.data[i + 2] = b;
          result.data[i + 3] = a;
        }
      }
    }
  }
  
  return result;
}

// Full crystallization pipeline
export function crystallize(
  canvas: HTMLCanvasElement,
  pixelSize: number = 4,
  paletteSize: number = 8
): CrystallizedImage {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Extract palette
  const palette = extractPalette(imageData, paletteSize);
  
  // Pixelate
  const pixelated = pixelate(imageData, pixelSize);
  
  // Apply pixelated data
  ctx.putImageData(pixelated, 0, 0);
  
  // Export as PNG
  const dataUrl = canvas.toDataURL('image/png');
  
  return {
    data: dataUrl,
    timestamp: Date.now(),
    thoughtCount: 0, // Will be set by caller
    agentIds: [], // Will be set by caller
    palette,
  };
}

// Export canvas to downloadable file
export function downloadCrystallizedImage(
  canvas: HTMLCanvasElement,
  filename?: string
): void {
  const pixelSize = 4;
  
  // Create temp canvas for crystallization
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.drawImage(canvas, 0, 0);
  
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const pixelated = pixelate(imageData, pixelSize);
  tempCtx.putImageData(pixelated, 0, 0);
  
  // Create download link
  const link = document.createElement('a');
  link.download = filename || `consciousness_${Date.now()}.png`;
  link.href = tempCanvas.toDataURL('image/png');
  link.click();
}
