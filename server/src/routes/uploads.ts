import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { badRequest } from '../lib/errors.js';
import { requireUser } from '../services/session.js';
import { requirePanelAccess } from '../services/account.js';
import { randomId } from '../lib/tokens.js';

const MAX_BYTES = 2 * 1024 * 1024;

function detectImageType(buffer: Buffer): 'png' | 'jpeg' | 'webp' | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'png';
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

export async function uploadRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  app.post('/api/uploads/emblem', async (request, reply) => {
    const user = requireUser(request, ctx.db, ctx.config);
    requirePanelAccess(ctx.db, user);
    if (!request.isMultipart()) throw badRequest('Dosya yüklemesi bekleniyor.');
    const file = await request.file({ limits: { fileSize: MAX_BYTES, files: 1 } });
    if (!file) throw badRequest('Dosya bulunamadı.');
    const buffer = await file.toBuffer();
    if (file.file.truncated || buffer.length > MAX_BYTES) {
      throw badRequest('Amblem en fazla 2 MB olabilir.');
    }
    const type = detectImageType(buffer);
    if (!type) throw badRequest('Yalnızca PNG, JPEG veya WebP görseller yükleyebilirsin.');
    const filename = `emblem-${randomId('img').replace('img_', '')}.${type === 'jpeg' ? 'jpg' : type}`;
    await writeFile(join(ctx.config.uploadsDir, filename), buffer);
    return reply.code(201).send({ url: `/uploads/${filename}`, size: buffer.length, type });
  });
}
