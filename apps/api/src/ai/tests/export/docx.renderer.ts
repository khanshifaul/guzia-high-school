// src/ai/tests/export/docx.renderer.ts — A4 DOCX from the normalised model.
//
// The header is one continuous section with a single column; the MCQ body is a
// second, continuous section with two columns (the archive's 30-items-on-one-
// page shape). The creative body stays single-column.
//
// Fonts are explicit on every run: Latin text in Liberation Sans and Bengali
// (complex script) in Noto Sans Bengali. The same mapping is written as the
// document default so Word does not fall back to a legacy face for any run the
// renderer does not touch.
import {
    AlignmentType,
    BorderStyle,
    Document,
    Packer,
    Paragraph,
    SectionType,
    TextRun,
    type IFontAttributesProperties,
    type ISectionOptions,
} from 'docx';
import { type PaperItem, type PaperModel, toBengaliDigits } from './paper.model';

/** twips: 1 mm = 56.6929; A4 is 210 × 297 mm. */
const A4_WIDTH = 11906;
const A4_HEIGHT = 16838;
const MARGIN_12MM = 680;

/** Half-points: 9.5pt body text, matching the archive. */
const BODY_SIZE = 19;
const SMALL_SIZE = 17;

const BODY_FONT: IFontAttributesProperties = {
    ascii: 'Liberation Sans',
    hAnsi: 'Liberation Sans',
    cs: 'Noto Sans Bengali',
    eastAsia: 'Noto Sans Bengali',
};

const OPTION_LABELS = ['ক', 'খ', 'গ', 'ঘ'] as const;

interface RunStyle {
    bold?: boolean;
    italics?: boolean;
    size?: number;
}

function run(text: string, style: RunStyle = {}): TextRun {
    return new TextRun({ text, font: BODY_FONT, size: BODY_SIZE, ...style });
}

/** Splits stored multi-line text into line-broken runs; never rewrites it. */
function textRuns(value: string, style: RunStyle = {}): TextRun[] {
    return value.split(/\r?\n/).map((line, index) =>
        new TextRun({
            text: line,
            font: BODY_FONT,
            size: style.size ?? BODY_SIZE,
            bold: style.bold,
            italics: style.italics,
            break: index > 0 ? 1 : undefined,
        }),
    );
}

function pageProperties() {
    return {
        page: {
            size: { width: A4_WIDTH, height: A4_HEIGHT },
            margin: {
                top: MARGIN_12MM,
                right: MARGIN_12MM,
                bottom: MARGIN_12MM,
                left: MARGIN_12MM,
            },
        },
    } as const;
}

function headerParagraphs(model: PaperModel): Paragraph[] {
    const { header } = model;
    return [
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [run(header.schoolName, { bold: true, size: 30 })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [run(header.examName, { bold: true, size: 24 })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 30 },
            children: [run(`${header.className} · ${header.subjectName}`, { size: 20 })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [run(header.timeLine, { size: 20 })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [run(header.studentInfo, { size: 18 })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            border: {
                bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 2 },
            },
            children: [run(header.instruction, { size: SMALL_SIZE, italics: true })],
        }),
    ];
}

function questionParagraph(item: PaperItem, showMarks: boolean): Paragraph {
    const children: TextRun[] = [
        run(`${toBengaliDigits(item.number)}.`, { bold: true }),
        run(' '),
        ...textRuns(item.text),
    ];
    if (showMarks) {
        children.push(run(` (${toBengaliDigits(item.marks)})`, { size: SMALL_SIZE }));
    }
    return new Paragraph({
        keepLines: true,
        spacing: { before: 80, after: 20 },
        children,
    });
}

function optionParagraph(item: PaperItem): Paragraph | null {
    if (item.options.length === 0) return null;
    const children: TextRun[] = [];
    item.options.forEach((option, index) => {
        if (index > 0) children.push(run('  ', { size: SMALL_SIZE }));
        children.push(
            run(`${OPTION_LABELS[index] ?? String(index + 1)}) `, {
                bold: true,
                size: SMALL_SIZE,
            }),
        );
        children.push(...textRuns(option, { size: SMALL_SIZE }));
    });
    return new Paragraph({
        spacing: { after: 80 },
        indent: { left: 200 },
        children,
    });
}

function sectionHeading(model: PaperModel, section: PaperModel['sections'][number]): Paragraph | null {
    if (model.template !== 'creative') return null;
    const label = section.label ? `বিভাগ ${section.label} — ` : '';
    return new Paragraph({
        alignment: AlignmentType.CENTER,
        keepNext: true,
        spacing: { before: 160, after: 80 },
        children: [run(`${label}${section.heading}`, { bold: true, size: 21 })],
    });
}

function bodyParagraphs(model: PaperModel): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    for (const section of model.sections) {
        const heading = sectionHeading(model, section);
        if (heading) paragraphs.push(heading);
        for (const item of section.items) {
            paragraphs.push(questionParagraph(item, model.template === 'creative'));
            const options = optionParagraph(item);
            if (options) paragraphs.push(options);
        }
    }
    return paragraphs;
}

export async function renderDocx(model: PaperModel): Promise<Buffer> {
    const header = headerParagraphs(model);
    const body = bodyParagraphs(model);

    const sections: ISectionOptions[] =
        model.template === 'mcq'
            ? [
                  { properties: pageProperties(), children: header },
                  {
                      properties: {
                          ...pageProperties(),
                          type: SectionType.CONTINUOUS,
                          column: { count: 2, space: 360, equalWidth: true },
                      },
                      children: body,
                  },
              ]
            : [{ properties: pageProperties(), children: [...header, ...body] }];

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: { font: BODY_FONT, size: BODY_SIZE },
                },
            },
        },
        sections,
    });

    return Packer.toBuffer(doc);
}
