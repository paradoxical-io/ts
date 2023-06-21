import { IPAddress } from '@paradox/types';

import { log } from '../logger';

export type AuditAction = string;
export type AuditIdNames = string;

/**
 * Audit implementations should publish and consume this wrapper type
 */
export interface AuditPayload<T extends AuditAction> {
  /**
   * The underlying audit event
   */
  event: AuditEvent<T>;

  /**
   * The current traceID if one exists
   */
  trace?: string;

  /**
   * The unix datetime when the event was created
   */
  timestamp: number;

  /**
   * Who did the action
   */
  initiatedBy?: string;

  /**
   * The originating ip address if known
   */
  ipAddress?: IPAddress;
}

export type AuditUser = string | 'system';

export interface AuditSuppliedId<T extends AuditIdNames = string> {
  value: string;
  type: T;
}
/**
 * An instance of an audit event with actions defined by types of T
 */
export interface AuditEvent<T extends AuditAction, SuppliedId extends AuditIdNames = string> {
  /**
   * The context of the audit event should relate to a user
   */
  userId?: string;

  /**
   * Whether a user actually did the call or not
   */
  systemInitiated?: boolean;

  /**
   * If applicable, the ID that is being acted upon. For example, this may be a transaction ID
   * or an account ID, etc
   */
  suppliedId?: AuditSuppliedId<SuppliedId>;

  /**
   * The structured action type that was performed. Defined by the auditing implementation
   */
  action: T;

  /**
   * An optional message
   */
  message?: string;

  /**
   * Optional simple context to provide
   */
  context?: {
    [k: string]: string | number | boolean | undefined | null;
  };

  /**
   * The person that initiated the request that led to this audit. Can be a userId, support dashboard user email, etc.
   *
   * @note this is normally picked up automatically by the cls handler wrapper, but exposed as an option here for cases
   * where the audit is happening outside of the request/cls scope
   */
  initiatedBy?: string;
}

/**
 * An auditor contract
 */
export interface Auditor<T extends AuditAction, IdTypes extends AuditIdNames = string> {
  audit(...events: Array<AuditEvent<T, IdTypes>>): Promise<void>;

  // a fire and forget version of auditing
  auditForget(...events: Array<AuditEvent<T, IdTypes>>): void;
}

/**
 * An auditor that does nothing, used for stubbing
 */
export class NoOpAuditor<T extends AuditAction, IdTypes extends AuditIdNames = string> implements Auditor<T, IdTypes> {
  async audit(...events: Array<AuditEvent<T, IdTypes>>): Promise<void> {
    // do nothing
    this.log(events);
  }

  auditForget(...events: Array<AuditEvent<T, IdTypes>>): void {
    this.log(events);
  }

  private log(events: Array<AuditEvent<T, IdTypes>>) {
    events.forEach(e => {
      if (e.message) {
        log
          .with({
            userId: e.userId,
            ...e.context,
            ...(e.suppliedId ? { [e.suppliedId.type]: e.suppliedId.value } : {}),
          })
          .info(`NO-OP AUDIT: ${e.message}`);
      }
    });
  }
}
