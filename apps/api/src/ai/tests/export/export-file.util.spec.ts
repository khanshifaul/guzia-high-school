// src/ai/tests/export/export-file.util.spec.ts — filename and header shape.
import { BadRequestException } from '@nestjs/common';
import { contentDisposition, exportFilename, parseExportFormat } from './export-file.util';

describe('export file metadata', () => {
    it('names the download subject-class-title.extension', () => {
        expect(
            exportFilename(
                {
                    subjectName: 'গণিত',
                    className: 'নবম শ্রেণি',
                    title: 'বার্ষিক পরীক্ষা',
                },
                'docx',
            ),
        ).toBe('গণিত-নবম শ্রেণি-বার্ষিক পরীক্ষা.docx');
    });

    it('keeps path separators out of the filename', () => {
        expect(
            exportFilename(
                { subjectName: 'Math/Algebra', className: 'Class: 9', title: 'Paper "A"' },
                'pdf',
            ),
        ).toBe('Math Algebra-Class 9-Paper A.pdf');
    });

    it('sends the UTF-8 name with an ASCII fallback', () => {
        const header = contentDisposition('গণিত-নবম শ্রেণি-বার্ষিক পরীক্ষা.pdf');
        expect(header).toMatch(/^attachment; filename="paper\.pdf"; filename\*=UTF-8''/);
        expect(header).toContain('%E0%A6%97%E0%A6%A3%E0%A6%BF%E0%A6%A4');
    });

    it('keeps the readable ASCII part when the name is partly Latin', () => {
        const header = contentDisposition('Class-9-পরীক্ষা.pdf');
        expect(header).toContain('filename="Class-9.pdf"');
    });

    it('defaults to PDF and rejects an unknown format', () => {
        expect(parseExportFormat(undefined)).toBe('pdf');
        expect(parseExportFormat('')).toBe('pdf');
        expect(parseExportFormat('docx')).toBe('docx');
        expect(() => parseExportFormat('html')).toThrow(BadRequestException);
    });
});
