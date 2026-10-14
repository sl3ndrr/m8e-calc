import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { ModeLoadError } from './ModeErrorBoundary';
import type { IconName } from '../ui';
import type { MessageKey } from '../shared/i18n';
import type { ModeId } from '../shared/modes';
import {
  createHistoryAdapter,
  type HistoryAdapter,
} from '../shared/historyAdapter';
export interface ModeDefinition {
  id: ModeId;
  icon: IconName;
  labelKey: MessageKey;
  component: LazyExoticComponent<ComponentType>;
  historyAdapter: HistoryAdapter;
}
export const modeRegistry: readonly ModeDefinition[] = [
  {
    id: 'simple',
    icon: 'calculate',
    labelKey: 'mode.simple',
    component: lazy(() => import('../features/simple/SimpleMode').catch(() => { throw new ModeLoadError('Mode load failed'); })),
    historyAdapter: createHistoryAdapter(),
  },
  {
    id: 'scientific',
    icon: 'science',
    labelKey: 'mode.scientific',
    component: lazy(() => import('../features/scientific/ScientificMode').catch(() => { throw new ModeLoadError('Mode load failed'); })),
    historyAdapter: createHistoryAdapter(),
  },
  {
    id: 'convert',
    icon: 'swap_horiz',
    labelKey: 'mode.convert',
    component: lazy(() => import('../features/convert/ConvertMode').catch(() => { throw new ModeLoadError('Mode load failed'); })),
    historyAdapter: createHistoryAdapter(),
  },
  {
    id: 'graph',
    icon: 'show_chart',
    labelKey: 'mode.graph',
    component: lazy(() => import('../features/graph/GraphMode').catch(() => { throw new ModeLoadError('Mode load failed'); })),
    historyAdapter: createHistoryAdapter(),
  },
];
export function getMode(mode: ModeId): ModeDefinition {
  const definition = modeRegistry.find((item) => item.id === mode);
  if (!definition) throw new Error('Mode missing from registry');
  return definition;
}

