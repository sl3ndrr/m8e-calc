import type { ComponentType } from 'react';
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
  load: () => Promise<{ default: ComponentType }>;
  historyAdapter: HistoryAdapter;
}
export const modeRegistry: readonly ModeDefinition[] = [
  {
    id: 'simple',
    icon: 'calculate',
    labelKey: 'mode.simple',
    load: () => import('../features/simple/SimpleMode'),
    historyAdapter: createHistoryAdapter(),
  },
  {
    id: 'scientific',
    icon: 'science',
    labelKey: 'mode.scientific',
    load: () => import('../features/scientific/ScientificMode'),
    historyAdapter: createHistoryAdapter(),
  },
  {
    id: 'convert',
    icon: 'swap_horiz',
    labelKey: 'mode.convert',
    load: () => import('../features/convert/ConvertMode'),
    historyAdapter: createHistoryAdapter(),
  },
  {
    id: 'graph',
    icon: 'show_chart',
    labelKey: 'mode.graph',
    load: () => import('../features/graph/GraphMode'),
    historyAdapter: createHistoryAdapter(),
  },
];
export function getMode(mode: ModeId): ModeDefinition {
  const definition = modeRegistry.find((item) => item.id === mode);
  if (!definition) throw new Error('Mode missing from registry');
  return definition;
}

