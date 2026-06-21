import { gqlRequest } from '@/app/graphql.client';

export interface StaffRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  type: string;
  payload: string; // JSON-encoded
  summary: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewerName?: string | null;
  decisionNote?: string | null;
  error?: string | null;
  createdAt?: string | null;
  resolvedAt?: string | null;
}

export interface RequestCapabilities {
  submittable: string[];
  reviewable: string[];
}

const FIELDS = 'id requesterName type payload summary status reviewerName decisionNote error createdAt resolvedAt';

export const requestsApi = {
  myRequests: () =>
    gqlRequest<{ myRequests: StaffRequest[] }>(`query { myRequests { ${FIELDS} } }`).then(d => d.myRequests),

  pending: () =>
    gqlRequest<{ pendingRequests: StaffRequest[] }>(`query { pendingRequests { ${FIELDS} } }`).then(d => d.pendingRequests),

  capabilities: () =>
    gqlRequest<{ requestCapabilities: RequestCapabilities }>(`query { requestCapabilities { submittable reviewable } }`)
      .then(d => d.requestCapabilities),

  submit: (type: string, payload: unknown) =>
    gqlRequest<{ submitRequest: StaffRequest }>(
      `mutation Submit($type: String!, $payload: String!) { submitRequest(type: $type, payload: $payload) { ${FIELDS} } }`,
      { type, payload: JSON.stringify(payload) }
    ).then(d => d.submitRequest),

  review: (id: string, decision: 'approve' | 'reject', note?: string) =>
    gqlRequest<{ reviewRequest: StaffRequest }>(
      `mutation Review($id: ID!, $decision: String!, $note: String) { reviewRequest(id: $id, decision: $decision, note: $note) { ${FIELDS} } }`,
      { id, decision, note }
    ).then(d => d.reviewRequest),
};
