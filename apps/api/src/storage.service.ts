import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class StorageService {
  private client: SupabaseClient | null = null;

  bucket() {
    return process.env.SUPABASE_STORAGE_BUCKET ?? "attachments";
  }

  private supabase() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key)
      throw new ServiceUnavailableException(
        "Supabase Storage is not configured",
      );
    if (!this.client)
      this.client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    return this.client;
  }

  async createSignedUploadUrl(storageKey: string) {
    const { data, error } = await this.supabase()
      .storage.from(this.bucket())
      .createSignedUploadUrl(storageKey);
    if (error || !data)
      throw new ServiceUnavailableException(
        error?.message ?? "Unable to create upload URL",
      );
    return data;
  }

  async createSignedDownloadUrl(storageKey: string, expiresIn = 120) {
    const { data, error } = await this.supabase()
      .storage.from(this.bucket())
      .createSignedUrl(storageKey, expiresIn);
    if (error || !data)
      throw new ServiceUnavailableException(
        error?.message ?? "Unable to create download URL",
      );
    return data;
  }

  async objectExists(storageKey: string) {
    const { data, error } = await this.supabase()
      .storage.from(this.bucket())
      .createSignedUrl(storageKey, 10);
    return Boolean(!error && data?.signedUrl);
  }

  async remove(storageKey: string) {
    await this.supabase().storage.from(this.bucket()).remove([storageKey]);
  }
}
