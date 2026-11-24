/** Eventos internos de la aplicación (desacoplan catálogo ↔ búsqueda). */

export const CATALOG_CHANGED = 'catalog.changed';

export type SearchableEntity = 'artist' | 'album' | 'track' | 'playlist';

export interface CatalogChangedEvent {
  type: SearchableEntity;
  id: string;
  action: 'upsert' | 'delete';
}
