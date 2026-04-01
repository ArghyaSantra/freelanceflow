import { PDFDocument, rgb } from "pdf-lib";
import { downloadFromS3, uploadToS3, BUCKET } from "../lib/s3";
import { prisma } from "../lib/prisma";

interface EmbedSignatureData {
  documentId: string;
  signatureImage: string; // base64 PNG
}

export const embedSignature = async (
  data: EmbedSignatureData,
): Promise<void> => {
  const { documentId, signatureImage } = data;

  // load document from DB
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { documentFields: true },
  });

  if (!document) throw new Error(`Document ${documentId} not found`);

  // download original PDF from S3
  const fileKey = document.fileUrl.split(".amazonaws.com/")[1];
  const pdfBuffer = await downloadFromS3(fileKey);

  // load PDF with pdf-lib
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();

  // convert base64 signature to bytes
  const signatureBase64 = signatureImage.replace("data:image/png;base64,", "");
  const signatureBytes = Buffer.from(signatureBase64, "base64");
  const signatureImage_ = await pdfDoc.embedPng(signatureBytes);

  // embed signature on each document field
  for (const field of document.documentFields) {
    const pageIndex = field.pageNumber - 1;
    if (pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { width, height } = page.getSize();

    // convert percentage coordinates to absolute
    const x = field.x * width;
    const y = height - field.y * height - field.height * height;
    const sigWidth = field.width * width;
    const sigHeight = field.height * height;

    page.drawImage(signatureImage_, {
      x,
      y,
      width: sigWidth,
      height: sigHeight,
    });
  }

  // save signed PDF
  const signedPdfBytes = await pdfDoc.save();
  const signedBuffer = Buffer.from(signedPdfBytes);

  // upload signed PDF to S3

  const sanitizedKey = fileKey.replace(/\s+/g, "%20");
  const signedKey = sanitizedKey.replace(".pdf", "-signed.pdf");
  await uploadToS3(signedKey, signedBuffer);

  // update document with signed file URL
  const signedFileUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${signedKey}`;

  await prisma.document.update({
    where: { id: documentId },
    data: { signedFileUrl },
  });

  console.log(`✓ Signature embedded for document ${documentId}`);
};
