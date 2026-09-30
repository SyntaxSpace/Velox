const fs = require('fs');
const path = require('path');

function create2PagePdf(filePath) {
  // Compute stream lengths dynamically
  const stream1 = `BT
/F1 28 Tf
50 750 Td
(VELOX PRINT PLATFORM) Tj
/F1 18 Tf
0 -40 Td
(DUPLEX HARDWARE TEST - SIDE 1 [FRONT]) Tj
/F1 14 Tf
0 -35 Td
(Printer: RICOH M 2700) Tj
0 -25 Td
(Paper: A4 | Mode: 2-Sided Long Edge) Tj
0 -25 Td
(Status: Side 1 Printed Successfully) Tj
0 -40 Td
(Velox Production Print Engine - Day 11 Validation) Tj
ET`;

  const stream2 = `BT
/F1 28 Tf
50 750 Td
(VELOX PRINT PLATFORM) Tj
/F1 18 Tf
0 -40 Td
(DUPLEX HARDWARE TEST - SIDE 2 [BACK]) Tj
/F1 14 Tf
0 -35 Td
(Printer: RICOH M 2700) Tj
0 -25 Td
(Paper: A4 | Mode: 2-Sided Long Edge) Tj
0 -25 Td
(Status: Side 2 Printed on Same Sheet - Physical Duplex Verified!) Tj
0 -40 Td
(Velox Production Print Engine - Day 11 Validation) Tj
ET`;

  const objects = [];
  objects[1] = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  objects[2] = '2 0 obj\n<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>\nendobj\n';
  objects[3] =
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R >> >> /Contents 6 0 R >>\nendobj\n';
  objects[4] = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n';
  objects[5] =
    '5 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R >> >> /Contents 7 0 R >>\nendobj\n';
  objects[6] = `6 0 obj\n<< /Length ${Buffer.byteLength(stream1)} >>\nstream\n${stream1}\nendstream\nendobj\n`;
  objects[7] = `7 0 obj\n<< /Length ${Buffer.byteLength(stream2)} >>\nstream\n${stream2}\nendstream\nendobj\n`;

  let pdfContent = '%PDF-1.4\n';
  const offsets = [0];

  for (let i = 1; i <= 7; i++) {
    offsets[i] = Buffer.byteLength(pdfContent);
    pdfContent += objects[i];
  }

  const xrefOffset = Buffer.byteLength(pdfContent);
  let xref = 'xref\n0 8\n0000000000 65535 f \n';
  for (let i = 1; i <= 7; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }

  const trailer = `trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  pdfContent += xref + trailer;

  fs.writeFileSync(filePath, pdfContent);
  console.log(
    `Generated 2-page duplex test PDF at: ${filePath} (${Buffer.byteLength(pdfContent)} bytes)`,
  );
}

create2PagePdf(path.resolve(__dirname, '../test-assets/duplex-test-order.pdf'));
