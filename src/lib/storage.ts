import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
]);

export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

let supabaseClient: SupabaseClient | null = null;
let bucketChecked = false;

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabaseClient;
}

function getBucketName(): string {
  return process.env["SUPABASE_STORAGE_BUCKET"] || "saqotravel-media";
}

function sanitizeFileName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase() || ".jpg";
  const base = path
    .basename(originalName, path.extname(originalName))
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix = crypto.randomBytes(4).toString("hex");
  return `${base || "image"}-${Date.now()}-${suffix}${ext}`;
}

export function validateImageUpload(mimeType: string, sizeBytes: number): void {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(
      `Unsupported image format (${mimeType}). Allowed: JPEG, PNG, WebP, AVIF, GIF, SVG.`,
    );
  }
  if (sizeBytes <= 0 || sizeBytes > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Image size must be greater than 0 bytes and at most 8 MB.");
  }
}

export interface StoredImageResult {
  fileName: string;
  url: string;
  storagePath: string;
  storageProvider: "supabase" | "local";
}

export async function storeUploadedImage(params: {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  entityType: string;
  uploadsRootDir: string;
}): Promise<StoredImageResult> {
  validateImageUpload(params.mimeType, params.buffer.byteLength);

  const safeFolder = params.entityType.replace(/[^a-z0-9-_]/gi, "") || "general";
  const fileName = sanitizeFileName(params.originalName);
  const relativePath = `${safeFolder}/${fileName}`;

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const bucket = getBucketName();
    if (!bucketChecked) {
      const { data: buckets } = await supabase.storage.listBuckets();
      if (!buckets?.some((b) => b.name === bucket)) {
        await supabase.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: MAX_IMAGE_SIZE_BYTES,
        });
      }
      bucketChecked = true;
    }

    const { error } = await supabase.storage.from(bucket).upload(relativePath, params.buffer, {
      contentType: params.mimeType,
      upsert: true,
    });

    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(relativePath);
      return {
        fileName,
        url: data.publicUrl,
        storagePath: relativePath,
        storageProvider: "supabase",
      };
    }
    console.warn("Supabase Storage upload returned error; falling back to local storage:", error);
  }

  const targetDir = path.join(params.uploadsRootDir, safeFolder);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, fileName), params.buffer);

  return {
    fileName,
    url: `/uploads/${relativePath}`,
    storagePath: relativePath,
    storageProvider: "local",
  };
}

export async function removeStoredImage(params: {
  storagePath: string;
  storageProvider: string;
  uploadsRootDir: string;
}): Promise<void> {
  if (!params.storagePath) return;

  if (params.storageProvider === "supabase") {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      await supabase.storage.from(getBucketName()).remove([params.storagePath]);
    }
    return;
  }

  if (params.storageProvider === "local") {
    const resolved = path.resolve(params.uploadsRootDir, params.storagePath);
    if (resolved.startsWith(path.resolve(params.uploadsRootDir))) {
      await fs.rm(resolved, { force: true }).catch(() => undefined);
    }
  }
}
