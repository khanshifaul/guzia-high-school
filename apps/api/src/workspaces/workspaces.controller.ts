// src/workspaces/workspaces.controller.ts — the teacher's Studio workspaces.
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { RateLimit } from '../common/rate-limiter/rate-limit.guard';
import { WorkspacesService } from './workspaces.service';
import { AskThreadDto, AttachSourcesDto, CreateWorkspaceDto, UpdateWorkspaceDto } from './dto';

@ApiTags('Workspaces')
@Roles('TEACHER')
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly service: WorkspacesService) {}

  @Get()
  @ApiOperation({ summary: 'The teacher workspaces (auto-creates the default one)' })
  list(@User() user: { id: string }) {
    return this.service.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a workspace' })
  create(@Body() dto: CreateWorkspaceDto, @User() user: { id: string }) {
    return this.service.create(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One workspace: attached sources and its conversation' })
  findOne(@Param('id') id: string, @User() user: { id: string }) {
    return this.service.findOne(user.id, id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWorkspaceDto, @User() user: { id: string }) {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @User() user: { id: string }) {
    return this.service.remove(user.id, id);
  }

  @Post(':id/sources')
  @ApiOperation({ summary: 'Attach library sources (pointers, no re-upload)' })
  attach(@Param('id') id: string, @Body() dto: AttachSourcesDto, @User() user: { id: string }) {
    return this.service.attach(user.id, id, dto);
  }

  @Delete(':id/sources/:sourceId')
  @ApiOperation({ summary: 'Detach a source; it stays in the library' })
  detach(@Param('id') id: string, @Param('sourceId') sourceId: string, @User() user: { id: string }) {
    return this.service.detach(user.id, id, sourceId);
  }

  @Post(':id/messages')
  @RateLimit('ai:generate', 60_000, 10)
  @ApiOperation({ summary: 'Ask this workspace’s sources; persists both turns' })
  ask(@Param('id') id: string, @Body() dto: AskThreadDto, @User() user: { id: string }) {
    return this.service.ask(user.id, id, dto.question.trim());
  }

  @Delete(':id/messages')
  @ApiOperation({ summary: 'Clear the conversation, keeping the workspace' })
  clear(@Param('id') id: string, @User() user: { id: string }) {
    return this.service.clear(user.id, id);
  }
}
