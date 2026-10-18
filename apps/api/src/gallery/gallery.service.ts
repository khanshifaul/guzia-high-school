// src/gallery/gallery.service.ts — campus gallery CRUD.
import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateGalleryItemDto } from './dto/create-gallery-item.dto';

@Injectable()
export class GalleryService {
  constructor(private readonly prisma: DatabaseService) {}

  /** Public: all images, ordered. */
  async list() {
    return this.prisma.galleryItem.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] });
  }

  /** Admin: create an image entry. */
  async create(dto: CreateGalleryItemDto) {
    return this.prisma.galleryItem.create({ data: dto });
  }

  /** Admin: update an image entry. */
  async update(id: string, dto: Partial<CreateGalleryItemDto>) {
    await this.require(id);
    return this.prisma.galleryItem.update({ where: { id }, data: dto });
  }

  /** Admin: delete an image entry. */
  async remove(id: string) {
    await this.require(id);
    await this.prisma.galleryItem.delete({ where: { id } });
    return { deleted: true };
  }

  private async require(id: string) {
    const item = await this.prisma.galleryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Gallery item not found');
    return item;
  }
}
