import { PluginBase, PluginNameVersion } from '@hapi/hapi';

/**
 * SimplePlugin is an interface that wraps up the required interfaces to write
 * hapi plugins that can be used locally (without requiring sharing a pkg)
 */
export interface SimplePlugin extends PluginBase<void>, PluginNameVersion {}
