// src/fees/fees.controller.ts — fee heads, invoices, payments.
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { FeesModuleService } from './fees.service';
import { CreateFeeHeadDto, GenerateInvoicesDto, RecordPaymentDto } from './dto';

@ApiTags('Fees')
@Controller('fees')
export class FeesController {
    constructor(private readonly service: FeesModuleService) {}

    @Roles('ADMIN')
    @Get('heads')
    feeHeads() {
        return this.service.feeHeads();
    }

    @Roles('ADMIN')
    @Post('heads')
    createFeeHead(@Body() dto: CreateFeeHeadDto) {
        return this.service.createFeeHead(dto);
    }

    @Roles('ADMIN')
    @Post('invoices/generate')
    @ApiOperation({ summary: 'Bulk-assign a fee head to students' })
    generateInvoices(@Body() dto: GenerateInvoicesDto) {
        return this.service.generateInvoices(dto);
    }

    @Roles('ADMIN', 'STUDENT', 'PARENT')
    @Get('ledger/:studentId')
    @ApiOperation({ summary: 'Student fee ledger (invoices + payments + due)' })
    studentLedger(@Param('studentId') studentId: string) {
        return this.service.studentLedger(studentId);
    }

    @Roles('ADMIN')
    @Post('payments')
    @ApiOperation({ summary: 'Record a payment (oldest-first waterfall)' })
    recordPayment(@Body() dto: RecordPaymentDto, @User() user: { id: string }) {
        return this.service.recordPayment(dto, user.id);
    }
}
