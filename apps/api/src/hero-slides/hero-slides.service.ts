import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHeroSlideDto } from './dto/create-hero-slide.dto';
import { UpdateHeroSlideDto } from './dto/update-hero-slide.dto';

@Injectable()
export class HeroSlidesService {
  constructor(private prisma: PrismaService) {}

  findAllPublic() {
    return this.prisma.heroSlide.findMany({
      where: { published: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findAll() {
    return this.prisma.heroSlide.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findOne(id: string) {
    return this.prisma.heroSlide.findUnique({ where: { id } });
  }

  create(data: CreateHeroSlideDto) {
    return this.prisma.heroSlide.create({ data });
  }

  async update(id: string, data: UpdateHeroSlideDto) {
    const exists = await this.prisma.heroSlide.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Hero slide not found');
    return this.prisma.heroSlide.update({ where: { id }, data });
  }

  async remove(id: string) {
    const exists = await this.prisma.heroSlide.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Hero slide not found');
    return this.prisma.heroSlide.delete({ where: { id } });
  }

  async reorder(items: { id: string; sortOrder: number }[]) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.heroSlide.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
    return this.findAll();
  }
}
