import { ExcelRow, ImageAsset } from '@/types';
import { createAssetFromImage } from './assets';

/** A small built-in demo (two templates, five people, matching photos) so the app can be tried with one click. */

export const SAMPLE_HEADERS = ['Name', 'Course', 'Date', 'Score', 'ID', 'Photo'];

const PEOPLE: { name: string; course: string; date: string; score: number; id: string; color: string }[] = [
  { name: 'ana lopez', course: 'Data Analysis', date: '2026-06-01', score: 94.5, id: 'EM-1001', color: '#2563eb' },
  { name: 'ben carter', course: 'Web Design', date: '2026-06-01', score: 88, id: 'EM-1002', color: '#059669' },
  { name: 'chen wei', course: 'Data Analysis', date: '2026-06-02', score: 91.25, id: 'EM-1003', color: '#d97706' },
  { name: 'dina patel', course: 'Public Speaking', date: '2026-06-02', score: 97, id: 'EM-1004', color: '#7c3aed' },
  { name: 'eli novak', course: 'Web Design', date: '2026-06-03', score: 85.75, id: 'EM-1005', color: '#dc2626' },
];

export const sampleRows = (): ExcelRow[] =>
  PEOPLE.map((p) => ({
    Name: p.name,
    Course: p.course,
    Date: p.date,
    Score: p.score,
    ID: p.id,
    Photo: `${p.name.split(' ')[0]}.png`,
  }));

const canvasToImage = (canvas: HTMLCanvasElement): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to build sample image'));
    img.src = canvas.toDataURL('image/png');
  });

const makeCanvas = (w: number, h: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  return { canvas, ctx };
};

export const makeSampleCertificate = async (accent: string): Promise<HTMLImageElement> => {
  const { canvas, ctx } = makeCanvas(1200, 850);
  ctx.fillStyle = '#fffdf7';
  ctx.fillRect(0, 0, 1200, 850);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 10;
  ctx.strokeRect(30, 30, 1140, 790);
  ctx.lineWidth = 2;
  ctx.strokeRect(50, 50, 1100, 750);
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.font = 'bold 48px Georgia, serif';
  ctx.fillText('Certificate of Achievement', 600, 170);
  ctx.font = '26px Georgia, serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('This certificate is proudly presented to', 600, 290);
  ctx.fillText('for completing the course', 600, 470);
  ctx.fillText('with a score of', 600, 590);
  return canvasToImage(canvas);
};

const makeAvatar = async (initials: string, color: string): Promise<HTMLImageElement> => {
  const { canvas, ctx } = makeCanvas(320, 320);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 320, 320);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = 'bold 130px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, 160, 168);
  return canvasToImage(canvas);
};

export const makeSampleAssets = async (): Promise<ImageAsset[]> =>
  Promise.all(
    PEOPLE.map(async (p) => {
      const [first, last] = p.name.split(' ');
      const image = await makeAvatar((first[0] + last[0]).toUpperCase(), p.color);
      return createAssetFromImage(`${first}.png`, image);
    })
  );
