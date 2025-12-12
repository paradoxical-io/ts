import { Tags } from './contracts';
import { StatsD } from 'hot-shots';
import { timed as timingDecorator } from '@paradoxical-io/common';
import { Metrics } from './metrics';

/**
 * Emits a statsd metric timing the method
 * @param stat An optional stat name. If not supplied a default one will be used (prefer default)
 * @param tags Custom set of tags to use. The tag: "name" will always be included which is the class name and method
 * @param metrics Metrics emitter
 */
export function timed({ stat, tags = {}, metrics }: { stat?: string; tags?: Tags, metrics?: Pick<StatsD, 'timing'> } = {}) {
  return timingDecorator({ stat, tags, metrics: metrics ?? Metrics.instance });
}
