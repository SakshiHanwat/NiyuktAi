// pdfreader uses CommonJS require pattern — ESM-safe via dynamic require
// Install: npm install pdfreader

export interface PDFMetadata {
  pages: number;
  text: string;
}

/**
 * Extracts plain text from a PDF buffer using pdfreader.
 * Uses the callback-based PdfReader.parseBuffer pattern.
 */
export function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PdfReader } = require("pdfreader");

    const lines: Map<number, string[]> = new Map(); // y-coord → words
    let currentPage = 0;

    new PdfReader().parseBuffer(buffer, (err: Error | null, item: PdfItem | null) => {
      if (err) {
        reject(new Error(`PDF parsing error: ${err.message}`));
        return;
      }

      if (!item) {
        // End of file — assemble text preserving line order
        const allText: string[] = [];
        const sortedY = Array.from(lines.keys()).sort((a, b) => a - b);
        for (const y of sortedY) {
          const words = lines.get(y) ?? [];
          allText.push(words.join(" "));
        }
        resolve(allText.join("\n").trim());
        return;
      }

      if (item.page) {
        currentPage = item.page;
        // Add page separator for multi-page documents
        if (currentPage > 1) {
          const separator = `\n--- Page ${currentPage} ---\n`;
          const sepY = currentPage * 10000; // unique Y key for separator
          lines.set(sepY, [separator]);
        }
      }

      if (item.text) {
        // Use page-aware Y coordinate to maintain reading order
        const yKey = currentPage * 10000 + Math.round((item.y ?? 0) * 100);
        if (!lines.has(yKey)) {
          lines.set(yKey, []);
        }
        lines.get(yKey)!.push(item.text);
      }
    });
  });
}

/**
 * Extracts text and page count metadata from a PDF buffer.
 */
export function extractPDFMetadata(buffer: Buffer): Promise<PDFMetadata> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PdfReader } = require("pdfreader");

    const lines: Map<number, string[]> = new Map();
    let totalPages = 0;
    let currentPage = 0;

    new PdfReader().parseBuffer(buffer, (err: Error | null, item: PdfItem | null) => {
      if (err) {
        reject(new Error(`PDF metadata extraction error: ${err.message}`));
        return;
      }

      if (!item) {
        // End of file
        const allText: string[] = [];
        const sortedY = Array.from(lines.keys()).sort((a, b) => a - b);
        for (const y of sortedY) {
          const words = lines.get(y) ?? [];
          allText.push(words.join(" "));
        }
        resolve({
          pages: totalPages,
          text: allText.join("\n").trim(),
        });
        return;
      }

      if (item.page) {
        currentPage = item.page;
        totalPages = Math.max(totalPages, currentPage);
      }

      if (item.text) {
        const yKey = currentPage * 10000 + Math.round((item.y ?? 0) * 100);
        if (!lines.has(yKey)) {
          lines.set(yKey, []);
        }
        lines.get(yKey)!.push(item.text);
      }
    });
  });
}

// Type definition for pdfreader items
interface PdfItem {
  page?: number;
  text?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}