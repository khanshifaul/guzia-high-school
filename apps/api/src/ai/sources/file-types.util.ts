// src/ai/sources/file-types.util.ts — the one table of uploadable source types.
//
// Both the accept/refuse decision and the 415 body read from SUPPORTED, so a
// format can never be accepted by one and missing from the other. Office
// formats stay on the markitdown/officeparser path (the upload path must never
// reject a .docx for being "not text"); HTML joins the text/markitdown path.
// Legacy .doc/.ppt/.xls are deliberately absent from SUPPORTED and are named in
// the 415 body with the format to save as.
import { UnsupportedMediaTypeException } from '@nestjs/common';

export type SourceFormat =
    | 'pdf'
    | 'docx'
    | 'pptx'
    | 'xlsx'
    | 'csv'
    | 'txt'
    | 'md'
    | 'html'
    | 'png'
    | 'jpeg'
    | 'webp';

/** Extraction path a format takes (see extract.util.ts). */
export type SourcePath = 'pdf' | 'image' | 'office' | 'html' | 'text';

export interface SupportedFormat {
    format: SourceFormat;
    label: string;
    path: SourcePath;
    /** Canonical MIME used for storage and for the vision call. */
    mime: string;
    extensions: readonly string[];
    mimes: readonly string[];
}

export const SUPPORTED: readonly SupportedFormat[] = [
    {
        format: 'pdf',
        label: 'PDF',
        path: 'pdf',
        mime: 'application/pdf',
        extensions: ['.pdf'],
        mimes: ['application/pdf'],
    },
    {
        format: 'docx',
        label: 'Word',
        path: 'office',
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extensions: ['.docx'],
        mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    },
    {
        format: 'pptx',
        label: 'PowerPoint',
        path: 'office',
        mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        extensions: ['.pptx'],
        mimes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    },
    {
        format: 'xlsx',
        label: 'Excel',
        path: 'office',
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extensions: ['.xlsx'],
        mimes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    },
    {
        format: 'csv',
        label: 'CSV',
        path: 'text',
        mime: 'text/csv',
        extensions: ['.csv'],
        mimes: ['text/csv', 'application/csv'],
    },
    {
        format: 'txt',
        label: 'plain text',
        path: 'text',
        mime: 'text/plain',
        extensions: ['.txt'],
        mimes: ['text/plain'],
    },
    {
        format: 'md',
        label: 'Markdown',
        path: 'text',
        mime: 'text/markdown',
        extensions: ['.md', '.markdown'],
        mimes: ['text/markdown', 'text/x-markdown'],
    },
    {
        format: 'html',
        label: 'HTML',
        path: 'html',
        mime: 'text/html',
        extensions: ['.html', '.htm'],
        mimes: ['text/html', 'application/xhtml+xml'],
    },
    {
        format: 'png',
        label: 'PNG image',
        path: 'image',
        mime: 'image/png',
        extensions: ['.png'],
        mimes: ['image/png'],
    },
    {
        format: 'jpeg',
        label: 'JPEG image',
        path: 'image',
        mime: 'image/jpeg',
        extensions: ['.jpg', '.jpeg', '.jpe'],
        mimes: ['image/jpeg', 'image/jpg'],
    },
    {
        format: 'webp',
        label: 'WebP image',
        path: 'image',
        mime: 'image/webp',
        extensions: ['.webp'],
        mimes: ['image/webp'],
    },
];

/** Named in the 415 body so a legacy upload has a way forward, not just a no. */
export const LEGACY_OFFICE: readonly { extension: string; mime: string; saveAs: string }[] = [
    { extension: '.doc', mime: 'application/msword', saveAs: '.docx' },
    { extension: '.ppt', mime: 'application/vnd.ms-powerpoint', saveAs: '.pptx' },
    { extension: '.xls', mime: 'application/vnd.ms-excel', saveAs: '.xlsx' },
];

export interface DetectedFile {
    format: SourceFormat;
    path: SourcePath;
    mime: string;
}

function extensionOf(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

/** The supported format for this upload, or null when it is not accepted. */
export function detectFile(file: { originalname: string; mimetype: string }): DetectedFile | null {
    const extension = extensionOf(file.originalname);
    const mime = file.mimetype.split(';')[0].trim().toLowerCase();

    const byExtension = SUPPORTED.find((entry) => entry.extensions.includes(extension));
    if (byExtension) return { format: byExtension.format, path: byExtension.path, mime: byExtension.mime };

    const byMime = SUPPORTED.find((entry) => entry.mimes.includes(mime));
    if (byMime) return { format: byMime.format, path: byMime.path, mime: byMime.mime };

    return null;
}

/** 415 with the accepted list (and the legacy formats, with what to save as). */
export function unsupportedFileError(originalname: string): UnsupportedMediaTypeException {
    const accepted = SUPPORTED.map((entry) => entry.format);
    const extensions = SUPPORTED.flatMap((entry) => entry.extensions);
    const legacy = LEGACY_OFFICE.map((entry) => ({
        extension: entry.extension,
        saveAs: entry.saveAs,
    }));
    const legacyNote = LEGACY_OFFICE.map(
        (entry) => `${entry.extension} → ${entry.saveAs}`,
    ).join(', ');

    return new UnsupportedMediaTypeException({
        statusCode: 415,
        error: 'Unsupported Media Type',
        message:
            `Unsupported file type "${originalname}". Accepted: ${accepted.join(', ')}. ` +
            `Legacy Office files are not supported — save as ${legacyNote} first.`,
        accepted,
        extensions,
        legacy,
    });
}
