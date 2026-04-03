import dotenv from "dotenv";

dotenv.config();
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!.trim(),
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!.trim(),
  },
});

export const BUCKET = process.env.AWS_S3_BUCKET!;

export const downloadFromS3 = async (key: string): Promise<Buffer> => {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const response = await s3.send(command);

  const stream = response.Body as Readable;
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
};

export const uploadToS3 = async (
  key: string,
  buffer: Buffer,
  contentType: string = "application/pdf",
): Promise<void> => {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await s3.send(command);
};
