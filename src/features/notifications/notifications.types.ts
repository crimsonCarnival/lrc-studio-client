/** A notification as the list endpoint returns it; the type-specific payload stays loose. */
export interface AppNotification {
  _id: string;
  type: string;
  read?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}
