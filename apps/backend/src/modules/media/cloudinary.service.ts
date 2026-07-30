import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';

/**
 * CloudinaryService — uploads images to Cloudinary via native fetch API.
 * Uses Node.js 18+ built-in fetch — no extra dependencies needed.
 *
 * Environment variables (with hardcoded fallbacks for production deployment):
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly cloudName =
    process.env.CLOUDINARY_CLOUD_NAME || 'dqr88sp52';
  private readonly apiKey = process.env.CLOUDINARY_API_KEY || '494913964147373';
  private readonly apiSecret =
    process.env.CLOUDINARY_API_SECRET || 'A4xC9xl3bnGuS0c3kd_FDjrEqcw';
  private readonly isConfigured: boolean;

  constructor() {
    this.isConfigured = !!(this.cloudName && this.apiKey && this.apiSecret);
    if (this.isConfigured) {
      this.logger.log(`☁️  Cloudinary initialized for cloud: ${this.cloudName}`);
    } else {
      this.logger.warn(
        '⚠️  Cloudinary credentials missing. Image uploads will fail.',
      );
    }
  }

  /**
   * Upload a file buffer to Cloudinary.
   * @param buffer  Raw file bytes (from multer memoryStorage)
   * @param mimetype  e.g. 'image/jpeg'
   * @param originalname  Original filename (for multipart form)
   * @param folder  Cloudinary folder: 'reviews', 'products', 'cms'
   * @returns Secure HTTPS CDN URL of the uploaded image
   */
  async uploadBuffer(
    buffer: Buffer,
    mimetype: string,
    originalname: string,
    folder = 'uploads',
  ): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary not configured.');
    }

    const timestamp = Math.round(Date.now() / 1000);
    const signature = this.generateSignature(timestamp, folder);

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], { type: mimetype });
    formData.append('file', blob, originalname);
    formData.append('api_key', this.apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);
    formData.append('folder', folder);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

    const res = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    const data = (await res.json()) as any;

    if (!res.ok || !data.secure_url) {
      this.logger.error('Cloudinary error:', data);
      throw new Error(data.error?.message || 'Cloudinary upload failed');
    }

    this.logger.log(`✅ Cloudinary uploaded: ${data.secure_url}`);
    return data.secure_url as string;
  }

  /**
   * Generate SHA-1 signature for Cloudinary signed upload.
   * Signs: folder=<folder>&timestamp=<ts><api_secret>
   */
  private generateSignature(timestamp: number, folder: string): string {
    const params = `folder=${folder}&timestamp=${timestamp}${this.apiSecret}`;
    return createHmac('sha1', this.apiSecret)
      .update(params)
      .digest('hex');
  }

  get configured(): boolean {
    return this.isConfigured;
  }
}
