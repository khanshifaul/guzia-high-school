// src/admissions/admission-photo.util.ts — the student-photo rule.
//
// The photo is printed on the student's ID card, so it must be a square
// 300x300 px image no larger than 1 MB. One rule, enforced on the server;
// the wizard mirrors it only to fail fast.
import { imageSize } from 'image-size';

export const ADMISSION_PHOTO_MAX_BYTES = 1024 * 1024;
export const ADMISSION_PHOTO_SIZE = 300;

/**
 * Why this photo is unacceptable, or null when it is fine. The caller turns
 * the message into a 400.
 */
export function admissionPhotoProblem(
    buffer: Buffer,
    contentType: string,
    byteLength: number,
): string | null {
    if (!contentType.startsWith('image/')) {
        return 'The student photo must be an image.';
    }
    if (byteLength > ADMISSION_PHOTO_MAX_BYTES) {
        return 'The student photo must be 1 MB or smaller.';
    }
    const size = imageSize(buffer);
    if (!size.width || !size.height) {
        return 'The student photo could not be read.';
    }
    if (size.width !== ADMISSION_PHOTO_SIZE || size.height !== ADMISSION_PHOTO_SIZE) {
        return `The student photo must be exactly ${ADMISSION_PHOTO_SIZE}\u00d7${ADMISSION_PHOTO_SIZE} pixels.`;
    }
    return null;
}
