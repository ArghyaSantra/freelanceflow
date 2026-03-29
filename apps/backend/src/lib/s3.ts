import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";
import { NextFunction } from "express";

dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ADDRESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET!;

export const getPresignedUploadUrl = async (
  key: string,
  contentType: string = "application/pdf",
): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3, command, { expiresIn: 300 }); //5 minutes to upload
};

export const getPresignedDownloadUrl = async (key: string): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn: 3600 }); //1 hour to view
};

export const deleteObject = async (key: string): Promise<void> => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  await s3.send(command);
};

export const generateDocumentKey = (
  workspaceId: string,
  documentId: string,
  filename: string,
): string => {
  return `documents/${workspaceId}/${documentId}/${filename}`;
};
