import { request } from '@/app/api.client';
import { gqlRequest } from '@/app/graphql.client';
import { isApiError } from '@/types';
import type { Upload, SaveMediaInput } from '@/types';

interface CloudinarySignature {
  signature: string;
  timestamp: string | number;
  cloudName: string;
  apiKey: string;
  folder: string;
  resourceType: string;
  transformation?: string;
}

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  duration?: number | null;
}

// ── Cloudinary Uploads (must stay REST — uses multipart + reCAPTCHA signing) ──

export const uploadsService = {
  async getSignature({ fileName, fileSize, recaptchaToken }: { fileName: string; fileSize: number; recaptchaToken?: string }): Promise<CloudinarySignature> {
    return (await request<CloudinarySignature>('/uploads/signature', {
      method: 'POST',
      body: JSON.stringify({ fileName, fileSize, recaptchaToken }),
    }))!;
  },

  /**
   * Upload a file to Cloudinary using a server-signed request.
   * Returns { secure_url, public_id, duration }.
   */
  async uploadMedia(file: File, recaptchaToken?: string): Promise<CloudinaryUploadResult> {
    const { signature, timestamp, cloudName, apiKey, folder, resourceType } =
      await this.getSignature({ fileName: file.name, fileSize: file.size, recaptchaToken });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);
    formData.append('folder', folder);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/upload`,
      { method: 'POST', body: formData },
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(body.error?.message || `Upload failed: ${res.status}`);
    }

    const data = await res.json() as { secure_url: string; public_id: string; duration?: number };
    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
      duration: data.duration || null,
    };
  },

  async getAvatarSignature(file: File, recaptchaToken?: string): Promise<CloudinarySignature> {
    return (await request<CloudinarySignature>('/uploads/avatar-signature', {
      method: 'POST',
      body: JSON.stringify({ fileSize: file.size, recaptchaToken }),
    }))!;
  },

  async uploadAvatar(file: File, recaptchaToken?: string): Promise<{ url: string; publicId: string }> {
    const result = await this.uploadImage(file, () => this.getAvatarSignature(file, recaptchaToken));
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  },

  async uploadCoverImage(file: File, recaptchaToken?: string): Promise<string> {
    const result = await this.uploadImage(file, () =>
      (request<CloudinarySignature>('/uploads/cover-signature', {
        method: 'POST',
        body: JSON.stringify({ fileSize: file.size, fileName: file.name, recaptchaToken }),
      }).then((r) => r!))
    );
    return result.secure_url;
  },

  async uploadImage(file: File, signatureGetter: () => Promise<CloudinarySignature>): Promise<CloudinaryUploadResult> {
    const { signature, timestamp, cloudName, apiKey, folder, resourceType, transformation } =
      await signatureGetter();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);
    formData.append('folder', folder);
    if (transformation) formData.append('transformation', transformation);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/upload`,
      { method: 'POST', body: formData },
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(body.error?.message || `Upload failed: ${res.status}`);
    }

    const data = await res.json() as { secure_url: string; public_id: string };
    return { secure_url: data.secure_url, public_id: data.public_id };
  },

  // ── Media Library (migrated to GraphQL) ──

  async listMedia({ limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<Upload[]> {
    const data = await gqlRequest<{ uploads: Upload[] }>(/* GraphQL */ `
      query ListMedia($limit: Int, $offset: Int) {
        uploads(limit: $limit, offset: $offset) {
          id
          source
          fileName
          title
          duration
          uploadUrl
          publicId
          createdAt
          updatedAt
        }
      }
    `, { limit, offset });
    return data.uploads;
  },

  async getMedia(id: string): Promise<{ upload: Upload | null }> {
    const data = await gqlRequest<{ upload: Upload | null }>(/* GraphQL */ `
      query GetMedia($id: ID!) {
        upload(id: $id) {
          id
          source
          fileName
          title
          duration
          uploadUrl
          publicId
          createdAt
          updatedAt
          projects {
            id
            publicId
            title
            updatedAt
          }
        }
      }
    `, { id });
    return { upload: data.upload };
  },

  async saveMedia(input: SaveMediaInput): Promise<{ upload: Upload }> {
    try {
      const data = await gqlRequest<{ saveMedia: Upload }>(/* GraphQL */ `
        mutation SaveMedia($input: SaveMediaInput!) {
          saveMedia(input: $input) {
            id
            source
            fileName
            title
          }
        }
      `, { input });
      // Return upload directly (both GraphQL and normalized REST response)
      return { upload: data.saveMedia };
    } catch (err) {
      // Fallback to REST for unauthenticated requests or GraphQL errors
      console.warn('GraphQL saveMedia failed, falling back to REST:', isApiError(err) ? err.message : String(err));
      try {
        const restData = await request<{ upload: Upload }>('/uploads/media', {
          method: 'POST',
          body: JSON.stringify(input),
        });
        // REST returns { upload }, extract just the upload for consistency
        return { upload: restData!.upload };
      } catch (restErr) {
        console.error('REST fallback also failed:', restErr);
        throw err;
      }
    }
  },

  async deleteMedia(id: string): Promise<boolean> {
    const data = await gqlRequest<{ deleteMedia: boolean }>(/* GraphQL */ `
      mutation DeleteMedia($id: ID!) {
        deleteMedia(id: $id)
      }
    `, { id });
    return data.deleteMedia;
  },

  // updateMedia has no GQL equivalent yet — keep REST
  async updateMedia(id: string, patchData: Record<string, unknown>): Promise<unknown> {
    return request(`/uploads/media/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patchData),
    });
  },
};
