const fs = require('fs');
const path = require('path');

function createPdf(filePath, title, pages) {
  const objects = [];
  objects[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;

  let kids = [];
  for (let i = 0; i < pages; i++) {
    kids.push(`${3 + i * 2} 0 R`);
  }
  objects[2] = `2 0 obj\n<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages} >>\nendobj\n`;

  // Font is shared, put it at a fixed index at the end
  const fontIndex = 3 + pages * 2;
  objects[fontIndex] =
    `${fontIndex} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`;

  for (let i = 0; i < pages; i++) {
    const pageIndex = 3 + i * 2;
    const contentIndex = pageIndex + 1;

    objects[pageIndex] =
      `${pageIndex} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ${fontIndex} 0 R >> >> /Contents ${contentIndex} 0 R >>\nendobj\n`;

    const stream = `BT
/F1 28 Tf
50 750 Td
(VELOX PRINT PLATFORM) Tj
/F1 18 Tf
0 -40 Td
(${title}) Tj
/F1 14 Tf
0 -35 Td
(Page ${i + 1} of ${pages}) Tj
0 -25 Td
(Day 12 Reliability Validation) Tj
ET`;

    objects[contentIndex] =
      `${contentIndex} 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream\nendobj\n`;
  }

  let pdfContent = '%PDF-1.4\n';
  const offsets = [0];

  const objCount = 1 + objects.filter(Boolean).length;

  for (let i = 1; i <= objCount; i++) {
    offsets[i] = Buffer.byteLength(pdfContent);
    pdfContent += objects[i];
  }

  const xrefOffset = Buffer.byteLength(pdfContent);
  let xref = `xref\n0 ${objCount + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objCount; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }

  const trailer = `trailer\n<< /Size ${objCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  pdfContent += xref + trailer;

  fs.writeFileSync(filePath, pdfContent);
}

// Generate A, B, C, D, E
const outDir = path.resolve(__dirname, '../test-assets/day12');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

createPdf(path.join(outDir, 'Order_A.pdf'), 'CUSTOMER A - VELOX TEST DOCUMENT A', 1);
createPdf(path.join(outDir, 'Order_B.pdf'), 'CUSTOMER B - VELOX TEST DOCUMENT B', 1);
createPdf(path.join(outDir, 'Order_C.pdf'), 'CUSTOMER C - VELOX TEST DOCUMENT C', 2);
createPdf(path.join(outDir, 'Order_D.pdf'), 'CUSTOMER D - VELOX TEST DOCUMENT D', 1);
createPdf(path.join(outDir, 'Order_E.pdf'), 'CUSTOMER E - VELOX TEST DOCUMENT E', 2);

console.log('PDFs generated in test-assets/day12');
