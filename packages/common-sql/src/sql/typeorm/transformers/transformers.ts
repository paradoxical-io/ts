export interface ValueTransformer<DatabaseType, EntityType> {
  from(value: DatabaseType | undefined | null): EntityType | undefined | null;
  to(value: EntityType | undefined | null): DatabaseType | undefined | null;
}
