import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CATALOG_CHANGED, type CatalogChangedEvent } from '../common/events';
import { SearchService } from './search.service';

/**
 * Indexación incremental dirigida por eventos: cada cambio en el catálogo
 * sincroniza el documento con el motor de búsqueda en segundo plano.
 * (Con Mongo como driver es un no-op; la búsqueda lee las colecciones.)
 */
@Injectable()
export class SearchIndexListener {
  private readonly logger = new Logger(SearchIndexListener.name);

  constructor(private readonly search: SearchService) {}

  @OnEvent(CATALOG_CHANGED, { async: true })
  async handle(event: CatalogChangedEvent): Promise<void> {
    try {
      if (event.action === 'delete') await this.search.removeOne(event.type, event.id);
      else await this.search.syncOne(event.type, event.id);
    } catch (e) {
      this.logger.warn(`Indexación falló para ${event.type}:${event.id}: ${(e as Error).message}`);
    }
  }
}
