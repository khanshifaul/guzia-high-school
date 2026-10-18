// src/contact/contact.service.ts — stores public contact-form messages.
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  constructor(private readonly prisma: DatabaseService) {}

  /** Public: store a contact-form message. */
  async create(dto: CreateContactDto) {
    return this.prisma.contactMessage.create({ data: dto });
  }

  /** Admin: list messages, newest first. */
  async list() {
    return this.prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
  }

  /** Admin: mark a message read. */
  async markRead(id: string) {
    return this.prisma.contactMessage.update({
      where: { id },
      data: { read: true },
    });
  }
}
