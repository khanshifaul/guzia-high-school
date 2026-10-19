// src/workspaces/workspaces.module.ts — Studio workspaces + conversation.
import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({
  imports: [AiModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
})
export class WorkspacesModule {}
