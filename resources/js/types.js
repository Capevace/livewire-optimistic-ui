
/**
 * @typedef {Object} DataItem
 * @property {string|undefined} id
 * @property {boolean|undefined} _deleted
 * @property {boolean|undefined} _edited
 */

/**
 * @typedef {Object} Optimizer
 * @property {string} name
 * @property {string} statePath
 * @property {string} fn
 * @property {Record<string, string[]>} rules
 * @property {string} idAttribute
 * @property {string[]} parameters
 * @property {boolean} injectOptimisticId
 * @property {boolean} returnsCreatedId
 */

/**
 * @typedef {Object} OptimisticProps
 * @property {Record<Optimizer['name'], Optimizer>} optimizers
 */

/**
 * @typedef {Record<string, { all: [], added: [] }>} $Optimistic
 */

/**
 * @callback OptimizeSDKCreateFn
 * @param {any} data
 */

/**
 * @callback OptimizeSDKUpdateFn
 * @param {string} id
 * @param {any} data
 */

/**
 * @callback OptimizeSDKRemoveFn
 * @param {string} id
 */

/**
 * @typedef {Object} OptimizeSDK
 * @property {any[]} params
 * @property {string} id
 * @property {any} state
 * @property {Alpine} component
 * @property {any} wire
 * @property {OptimizeSDKCreateFn} create
 * @property {OptimizeSDKUpdateFn} update
 * @property {OptimizeSDKRemoveFn} remove
 */

/**
 * @typedef {Object} $Wire
 * @function $call
 * @function $get
 */

/**
 * @typedef {Object} Alpine
 * @function component
 * @function plugin
 * @function directive
 */
