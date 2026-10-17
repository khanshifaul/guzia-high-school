// src/site-settings/site-settings.service.ts — singleton public site info.
// GET returns the settings (seeding defaults on first read); admin PUT updates.
import { Injectable } from '@nestjs/common';
import { Prisma } from 'prisma/generated/client';
import { DatabaseService } from '../database/database.service';
import { UpdateSiteSettingsDto } from './dto/update-site-settings.dto';

/** Default important links (Rajshahi Board) seeded on first read. */
const DEFAULT_LINKS = [
  { label: 'Ministry of Education', labelBn: 'শিক্ষা মন্ত্রণালয়', href: 'https://moedu.gov.bd' },
  { label: 'Rajshahi Education Board', labelBn: 'রাজশাহী শিক্ষা বোর্ড', href: 'https://rajshahieducationboard.gov.bd' },
  { label: 'BANBEIS (EIIN)', labelBn: 'বানবেইস (EIIN)', href: 'https://banbeis.gov.bd' },
  { label: 'National Emergency', labelBn: 'জাতীয় জরুরি সেবা', href: 'tel:999' },
];

@Injectable()
export class SiteSettingsService {
  constructor(private readonly prisma: DatabaseService) {}

  /** Public read; creates the singleton row (with defaults) if missing. */
  async get() {
        const existing = await this.prisma.siteSetting.findUnique({ where: { id: 'singleton' } });
        if (existing) return existing;
        return this.prisma.siteSetting.create({
            data: {
                id: 'singleton',
                developedBy: 'Shifaul Islam',
                developedByUrl: 'https://shifaul.dev',
                importantLinks: DEFAULT_LINKS,
            },
        });
  }

  /** Admin update (partial). */
  async update(dto: UpdateSiteSettingsDto) {
    await this.get(); // ensure row exists
    const { importantLinks, ...rest } = dto;
    // Round-trip through JSON so DTO instances become plain objects for Prisma.
    const links = importantLinks
      ? (JSON.parse(JSON.stringify(importantLinks)) as Prisma.InputJsonValue)
      : undefined;
    return this.prisma.siteSetting.update({
      where: { id: 'singleton' },
      data: {
        ...rest,
        ...(links ? { importantLinks: links } : {}),
      },
    });
  }
}
