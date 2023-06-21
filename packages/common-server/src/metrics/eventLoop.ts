import { preciseTimeMilli } from '@paradox/common';
import { constants, NodeGCPerformanceDetail, PerformanceObserver } from 'perf_hooks';

import { log } from '../logger';
import { signals } from '../process';
import { Metrics } from './metrics';

/**
 * Monitors the delay that it takes to schedule a no-op timer
 * @param frequencyMS the frequency in milliseconds to test for lag
 * @param logOnMaxMS if set log when the event lag is greater than this value
 */
export function monitorNodeMetrics({
  frequencyMS = 1000,
  logOnMaxMS = 1000,
}: { frequencyMS?: number; logOnMaxMS?: number | null } = {}) {
  let start = preciseTimeMilli();
  let timeoutHandle: NodeJS.Timeout | null = null;

  // Create a gc performance observer
  const obs = new PerformanceObserver(list => {
    const entry = list.getEntries()[0];

    const kind = (entry.detail as NodeGCPerformanceDetail)?.kind;

    let kindName: string | undefined;

    switch (kind) {
      case constants.NODE_PERFORMANCE_GC_MAJOR:
        kindName = 'NODE_PERFORMANCE_GC_MAJOR';
        break;
      case constants.NODE_PERFORMANCE_GC_MINOR:
        kindName = 'NODE_PERFORMANCE_GC_MINOR';
        break;
      case constants.NODE_PERFORMANCE_GC_INCREMENTAL:
        kindName = 'NODE_PERFORMANCE_GC_INCREMENTAL';
        break;
      case constants.NODE_PERFORMANCE_GC_WEAKCB:
        kindName = 'NODE_PERFORMANCE_GC_WEAKCB';
        break;
      case constants.NODE_PERFORMANCE_GC_FLAGS_NO:
        kindName = 'NODE_PERFORMANCE_GC_FLAGS_NO';
        break;
      case constants.NODE_PERFORMANCE_GC_FLAGS_CONSTRUCT_RETAINED:
        kindName = 'NODE_PERFORMANCE_GC_FLAGS_CONSTRUCT_RETAINED';
        break;
      case constants.NODE_PERFORMANCE_GC_FLAGS_FORCED:
        kindName = 'NODE_PERFORMANCE_GC_FLAGS_FORCED';
        break;
      case constants.NODE_PERFORMANCE_GC_FLAGS_SYNCHRONOUS_PHANTOM_PROCESSING:
        kindName = 'NODE_PERFORMANCE_GC_FLAGS_SYNCHRONOUS_PHANTOM_PROCESSING';
        break;
      default:
        break;
    }

    Metrics.instance.timing(`node.gc.time`, entry.duration, { type: entry.entryType, kind: kindName ?? '-' });
  });

  // Subscribe to notifications of GCs
  obs.observe({ entryTypes: ['gc'] });

  // Stop subscription
  signals.onShutdown(async () => obs.disconnect());

  const check = () => {
    const now = preciseTimeMilli();

    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }

    // subtract the expected timeout duration from the delay from start
    const duration = Math.max(0, now - start - frequencyMS);
    Metrics.instance.timing('event_loop.lag', duration);

    const memUsage = process.memoryUsage();
    Metrics.instance.gauge('node.mem', memUsage.heapTotal, { type: 'heapTotal' });
    Metrics.instance.gauge('node.mem', memUsage.external, { type: 'external' });
    Metrics.instance.gauge('node.mem', memUsage.heapUsed, { type: 'heapUsed' });
    Metrics.instance.gauge('node.mem', memUsage.rss, { type: 'rss' });

    const cpuUsage = process.cpuUsage();
    Metrics.instance.gauge('node.cpu.user_time', cpuUsage.user);
    Metrics.instance.gauge('node.cpu.system_time', cpuUsage.system);

    if (logOnMaxMS && duration > logOnMaxMS) {
      log
        .with({ limitMS: logOnMaxMS, lagMS: duration })
        .warn(`Event loop lag is high.  lagMS=${duration}, limitMS=${logOnMaxMS} `);
    }

    schedule();
  };

  const schedule = () => {
    start = preciseTimeMilli();

    // don't hold the process open if pending checks are running
    timeoutHandle = setTimeout(check, frequencyMS).unref();
  };

  schedule();
}
