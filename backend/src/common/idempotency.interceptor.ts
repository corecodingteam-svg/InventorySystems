import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { KYSELY, Db } from '../database/database.module';
import { JwtPayload } from '../auth/jwt.strategy';

/**
 * Applied to critical write endpoints that a mobile client might retry
 * after a dropped connection (adjustments, transfers, stock count
 * approval — see docs/testing.md and the master spec's idempotency
 * requirement, §81). If the client sends an `Idempotency-Key` header and
 * that exact (organization, key, route) has already succeeded, the stored
 * response is replayed instead of re-running the handler — so a retried
 * "adjust stock by -5" can never apply twice.
 *
 * No header present = no idempotency guarantee, request runs normally;
 * this is an opt-in safety net, not a requirement on every caller.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(@Inject(KYSELY) private db: Db) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const key = request.headers['idempotency-key'] as string | undefined;
    if (!key) return next.handle();

    const user = request.user as JwtPayload | undefined;
    if (!user) return next.handle();

    const route = `${request.method} ${request.route?.path ?? request.url}`;

    return from(
      this.db
        .selectFrom('idempotency_keys')
        .select(['status_code', 'response_body'])
        .where('organization_id', '=', user.organizationId)
        .where('idempotency_key', '=', key)
        .where('route', '=', route)
        .executeTakeFirst(),
    ).pipe(
      switchMap((existing) => {
        if (existing) {
          request.res?.status(existing.status_code);
          return of(existing.response_body);
        }
        return next.handle().pipe(
          tap((body) => {
            this.db
              .insertInto('idempotency_keys')
              .values({
                organization_id: user.organizationId,
                idempotency_key: key,
                route,
                status_code: request.res?.statusCode ?? 200,
                response_body: JSON.stringify(body ?? null),
              })
              .onConflict((oc) => oc.columns(['organization_id', 'idempotency_key', 'route']).doNothing())
              .execute()
              .catch(() => {
                // Best-effort: losing the idempotency record must never fail
                // the request that already succeeded.
              });
          }),
        );
      }),
    );
  }
}
