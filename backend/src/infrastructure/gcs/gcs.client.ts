import { Storage } from "@google-cloud/storage";

export const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
});

export const bucket = storage.bucket(
  process.env.GCP_BUCKET_NAME as string
);
