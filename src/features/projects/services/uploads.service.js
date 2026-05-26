import { request } from '@/app/api.client.js';
import { gqlRequest } from '@/app/graphql.client.js';

// ── Cloudinary Uploads (must stay REST — uses multipart + reCAPTCHA signing) ──

export const uploadsService = {
  async getSignature({ fileName, fileSize, recaptchaToken }) {
    return request('/uploads/signature', {
      method: 'POST',
      body: JSON.stringify({ fileName, fileSize, recaptchaToken }),
    });
  },

  /**
   * Upload a file to Cloudinary using a server-signed request.
   * Returns { secure_url, public_id, duration }.
   */
  async uploadToCloudinary(file, recaptchaToken) {
    const { signature, timestamp, cloudName, apiKey, folder, resourceType } =
      await this.getSignature({ fileName: file.name, fileSize: file.size, recaptchaToken });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('folder', folder);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/upload`,
      { method: 'POST', body: formData },
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error?.message || `Upload failed: ${res.status}`);
    }

    const data = await res.json();
    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
      duration: data.duration || null,
    };
  },

  async getAvatarSignature(file, recaptchaToken) {
    return request('/uploads/avatar-signature', {
      method: 'POST',
      body: JSON.stringify({ fileSize: file.size, recaptchaToken }),
    });
  },

  async uploadAvatar(file, recaptchaToken) {
    const result = await this.uploadImage(file, () => this.getAvatarSignature(file, recaptchaToken));
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  },

  async uploadCoverImage(file, recaptchaToken) {
    const result = await this.uploadImage(file, () =>
      request('/uploads/cover-signature', {
        method: 'POST',
        body: JSON.stringify({ fileSize: file.size, fileName: file.name, recaptchaToken }),
      })
    );
    return result.secure_url;
  },

  async uploadImage(file, signatureGetter) {
    const { signature, timestamp, cloudName, apiKey, folder, resourceType, transformation } =
      await signatureGetter();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('folder', folder);
    if (transformation) formData.append('transformation', transformation);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/upload`,
      { method: 'POST', body: formData },
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error?.message || `Upload failed: ${res.status}`);
    }

    const data = await res.json();
    return { secure_url: data.secure_url, public_id: data.public_id };
  },

  // ── Media Library (migrated to GraphQL) ──

  async listMedia({ limit = 50, offset = 0 } = {}) {
    const data = await gqlRequest(`
      query ListMedia($limit: Int, $offset: Int) {
        uploads(limit: $limit, offset: $offset) {
          id
          source
          fileName
          title
          artist
          duration
          cloudinaryUrl
          publicId
          youtubeUrl
          spotifyTrackId
          createdAt
          updatedAt
        }
      }
    `, { limit, offset });
    return data.uploads;
  },

  async getMedia(id) {
    const data = await gqlRequest(`
      query GetMedia($id: ID!) {
        upload(id: $id) {
          id
          source
          fileName
          title
          artist
          duration
          cloudinaryUrl
          publicId
          youtubeUrl
          spotifyTrackId
          createdAt
          updatedAt
          projects {
            id
            projectId
            title
            updatedAt
          }
        }
      }
    `, { id });
    return { upload: data.upload };
  },

  async saveMedia(input) {
    try {
      const data = await gqlRequest(`
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
      console.warn('GraphQL saveMedia failed, falling back to REST:', err.message);
      try {
        const restData = await request('/uploads/media', {
          method: 'POST',
          body: JSON.stringify(input),
        });
        // REST returns { upload }, extract just the upload for consistency
        return { upload: restData.upload };
      } catch (restErr) {
        console.error('REST fallback also failed:', restErr);
        throw err;
      }
    }
  },

  async deleteMedia(id) {
    const data = await gqlRequest(`
      mutation DeleteMedia($id: ID!) {
        deleteMedia(id: $id)
      }
    `, { id });
    return data.deleteMedia;
  },

  // updateMedia has no GQL equivalent yet — keep REST
  async updateMedia(id, patchData) {
    return request(`/uploads/media/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patchData),
    });
  },
};
