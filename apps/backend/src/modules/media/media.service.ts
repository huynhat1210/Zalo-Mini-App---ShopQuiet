import { Injectable } from '@nestjs/common';

/**
 * MediaService — manages metadata for uploaded media.
 * Actual files are stored on Cloudinary (not local disk).
 * findAll() returns empty since Cloudinary manages file listing.
 * delete() is a no-op unless we add Cloudinary public_id tracking.
 */
@Injectable()
export class MediaService {
  /**
   * Returns list of uploaded media.
   * TODO: Store Cloudinary URLs in DB (Media table) and return them here.
   */
  async findAll() {
    return [];
  }

  /**
   * Delete a media file.
   * TODO: Track Cloudinary public_id in DB and call Cloudinary destroy API.
   */
  async delete(_filename: string) {
    return { success: true, message: 'File deleted (no-op, using Cloudinary)' };
  }
}
