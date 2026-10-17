// src/ai/provider-config.controller.ts — admin LLM provider settings.
import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { ProviderConfigService } from './provider-config.service';
import { UpdateProviderConfigDto } from './dto/update-provider-config.dto';

@ApiTags('AI Provider')
@Controller('ai/provider-config')
export class ProviderConfigController {
    constructor(private readonly service: ProviderConfigService) {}

    @Roles('ADMIN')
    @Get()
    @ApiOperation({ summary: 'Current LLM provider config (key masked)' })
    get() {
        return this.service.get();
    }

    @Roles('ADMIN')
    @Put()
    @ApiOperation({ summary: 'Update provider config (key write-only, encrypted)' })
    update(@Body() dto: UpdateProviderConfigDto, @User() user: { id: string }) {
        return this.service.update(dto, user.id);
    }

    @Roles('ADMIN')
    @Post('test')
    @ApiOperation({ summary: 'Test connection (accepts unsaved form values)' })
    test(@Body() dto: UpdateProviderConfigDto) {
        return this.service.testConnection(dto);
    }
}
