function uuid() {
    function s(n) { return h((Math.random() * (1<<(n<<2)))^Date.now()).slice(-n); }
    function h(n) { return (n|0).toString(16); }
    return  [
        s(4) + s(4), s(4),
        '4' + s(3),                    // UUID version 4
        h(8|(Math.random()*4)) + s(3), // {8|9|A|B}xxx
        // s(4) + s(4) + s(4),
        Date.now().toString(16).slice(-10) + s(2) // Use timestamp to avoid collisions
    ].join('-');
}

/**
 * @param {OptimisticProps} props
 * @returns any
 */
function OptimisticComponent({optimizers}) {
    /**
     * @property {$Wire} $wire
     * @property {Record<string, Optimizer>} optimizers
     * @property {Record<string, Record<string, DataItem>>} optimistic_updates
     */
    return {
        optimizers,
        optimistic_updates: {
            default: {}
        },

        /**
         * @returns {any}
         */
        get $optimistic() {
            let optimistic = {};

            for (const optimizer of Object.values(this.optimizers)) {
                optimistic[optimizer.name] = (...args) => {
                    return this.callOptimistic(optimizer.name, ...args);
                };
            }

            // Get all unique state paths from the optimizers
            const statePaths = new Set(
                Object.values(this.optimizers).map((optimizer) => optimizer.statePath)
            );

            // Add getters to the object so one can easily get the combined and added value lists
            for (const statePath of statePaths) {
                Object.defineProperty(
                    optimistic,
                    statePath,
                    {
                        get: () => this.$combined(statePath)
                    }
                );

                Object.defineProperty(
                    optimistic,
                    `${statePath}_added`,
                    {
                        get: () => this.$added(statePath)
                    }
                );
            }

            /**
             * @param {string} statePath
             * @param {string} id
             * @returns {boolean}
             */
            optimistic.$removed = (statePath, id) => {
                return this.optimistic_updates[statePath][id]?._deleted ?? false;
            };

            /**
             * @param {string} statePath
             * @param {string} id
             * @returns {boolean}
             */
            optimistic.$edited = (statePath, id) => {
                return this.optimistic_updates[statePath][id]?._edited ?? false;
            };

            /**
             * @param {string} statePath
             * @param {string} id
             * @returns {boolean}
             */
            optimistic.$created = (statePath, id) => {
                return this.optimistic_updates[statePath][id]?._created ?? false;
            };

            /**
             * @param {string} statePath
             * @param {string} id
             * @returns {?DataItem}
             */
            optimistic.$find = (statePath, id) => {
                if (!this.optimistic_updates[statePath]) {
                    return null;
                }

                let item = this.optimistic_updates[statePath][id];

                // if (item) {
                //     for (const optimizer of Object.values(this.optimizers)) {
                //         item[`$${optimizer.name}`] = (...args) => {
                //             // If the optimizer has the ID attribute as a parameter, add it to the arguments
                //             if (optimizer.parameters.includes(optimizer.idAttribute)) {
                //                 const idIndex = optimizer.parameters.indexOf(optimizer.idAttribute);
                //                 args.splice(idIndex, 0, id);
                //             } else {
                //                 // otherwise, add it as the first argument
                //                 args.unshift(id);
                //             }
                //
                //             return this.callOptimistic(optimizer.name, args);
                //         };
                //     }
                // }

                return item;
            };

            optimistic.$uuid = uuid;

            return optimistic;
        },

        /**
         * @param {string} statePath
         * @returns {DataItem[]}
         */
        $combined(statePath) {
            if (!this.optimistic_updates[statePath]) {
                return [];
            }

            let optimisticIds = Object.keys(this.optimistic_updates[statePath]);

            /**
             * @type {DataItem[]}
             */
            const items = this.$wire.$get(statePath)
                .map((item) => {
                    const idIndex = optimisticIds.indexOf(item.id);

                    // If the element was modified optimistically, remove it
                    if (idIndex > -1) {
                        optimisticIds.splice(idIndex, 1);
                    }

                    return {
                        ...item,
                        ...(this.optimistic_updates[statePath][item.id] ?? {})
                    };
                })
                .filter((item) => !item._deleted);

            optimisticIds
                .forEach((id) => {
                    if (this.optimistic_updates[statePath][id]._deleted) {
                        return;
                    }

                    items.push(this.optimistic_updates[statePath][id]);
                });

            return items;
        },

        /**
         * @param {string} statePath
         * @returns {DataItem[]}
         */
        $added(statePath) {
            if (!this.optimistic_updates[statePath]) {
                return [];
            }

            /**
             * @type {DataItem[]}
             */
            const state = Object.values(this.optimistic_updates[statePath] ?? []);

            return state.filter((item) => !item._deleted && !item._edited);
        },


        /**
         *
         * @param {string} method
         * @param {...any} params
         * @returns {Promise}
         */
        async callOptimistic(method, ...params) {
            /**
             * @type {?Optimizer}
             */
            const optimizer = this.optimizers[method];

            if (!optimizer) {
                console.warn(`Method ${method} has no optimizer! Running the function normally.`);

                return this.$wire.$call(method, ...params);
            }

            let id = optimizer.injectOptimisticId || !optimizer.parameters.includes(optimizer.idAttribute)
                ? uuid()
                : params[optimizer.parameters.indexOf(optimizer.idAttribute)];

            if (optimizer.injectOptimisticId) {
                params.unshift(id);
            }

            const cleanup = this.runOptimization(optimizer, id, params);

            const promise = this.$wire.$call(method, ...params);

            promise
                .then((returnedValue) => {
                    // if (optimizer.returnsCreatedId) {
                    //     const oldId = id;
                    //     id = returnedValue;
                    //
                    //     if (oldId !== id && oldId in this.optimistic_updates[optimizer.statePath]) {
                    //         this.optimistic_updates[optimizer.statePath][id] = {
                    //             ...this.optimistic_updates[optimizer.statePath][oldId],
                    //             id,
                    //         };
                    //
                    //         delete this.optimistic_updates[optimizer.statePath][oldId];
                    //     }
                    // }

                    cleanup(id);
                })
                .catch((e) => {
                    console.error('Error while running optimistic update:', e);

                    cleanup(id);
                });

            return promise;
        },

        /**
         * @param {Optimizer} optimizer
         * @param {string} id
         * @param {any[]} params
         * @returns {() => void}
         */
        runOptimization(optimizer, id, params) {
            const {statePath, fn} = optimizer;
            const currentState = this.$wire.$get(statePath);

            let undos = [];

            const initUpdatesIfNeeded = () => {
                if (!this.optimistic_updates[statePath]) {
                    this.optimistic_updates[statePath] = Alpine.reactive({});
                }
            };

            /**
             * @param {string} id
             */
            const decreaseCounterOrDelete = (id) => {
                /** @type {DataItem | undefined} */
                const item = this.optimistic_updates[statePath][id];

                console.info({ updates: this.optimistic_updates, item, statePath, id });

                if (item?._counter && item?._counter > 1) {
                    this.optimistic_updates[statePath][id]._counter--;
                } else {
                    this.optimistic_updates[statePath][id] = undefined;
                    delete this.optimistic_updates[statePath][id];
                }
            }

            /** @type {OptimizeSDKCreateFn} */
            const update = (id, data) => {
                initUpdatesIfNeeded();

                const counter = this.optimistic_updates[statePath][id]?._counter ?? 0;

                this.optimistic_updates[statePath][id] = {
                    id,
                    ...(this.optimistic_updates[statePath][id] ?? {}),
                    ...data,
                    _edited: true,
                    _counter: counter + 1
                };

                undos.push(decreaseCounterOrDelete);
            };

            /** @type {OptimizeSDKUpdateFn} */
            const create = (data) => {
                initUpdatesIfNeeded();

                if (this.optimistic_updates[statePath][id]) {
                    console.error(`Item with ID ${id} already exists for ${statePath} and cannot be created`);
                    return;
                }

                this.optimistic_updates[statePath][id] = {
                    id,
                    ...data,
                    _created: true,
                    _counter: 0,
                };

                undos.push(decreaseCounterOrDelete);
            };

            /** @type {OptimizeSDKRemoveFn} */
            const remove = (id) => {
                initUpdatesIfNeeded();

                this.optimistic_updates[statePath][id] = {
                    id,
                    ...(this.optimistic_updates[statePath][id] ?? {}),
                    _deleted: true,
                    _counter: (this.optimistic_updates[statePath][id]?._counter ?? 0) + 1
                };

                undos.push(decreaseCounterOrDelete);
            };

            /** @type {OptimizeSDK} */
            const sdk = {
                params,
                id,
                state: currentState,

                component: this,
                wire: this.$wire,

                create,
                update,
                remove
            };

            const injectedFunctionFactory = new Function('return function({ params, id, state, component, wire, create, update, remove }) { ' + fn + ' }');
            const callable = injectedFunctionFactory();

            callable.call(null, sdk);

            return (id) => {
                console.warn('Cleaning up optimistic updates:', id, undos);

                undos.forEach((undo) => undo(id));
            };
        },
    };
}

function OptimisticOptionDirective(el, {value, modifiers, expression}, {evaluate, evaluateLater, effect}) {
    console.info('Modifiers:', modifiers);

    const getItem = () => evaluate(`$item`);

    const status = modifiers[0];
    const option = modifiers[1];

    console.info({status, option});

    if (option === 'class' && expression) {
        const getValue = expression[0] === '{' || expression[0] === '['
            ? evaluateLater(expression)
            : () => expression;

        console.info('Classes:', getValue());

        effect(() => {
            const item = getItem();
            const classes = getValue();

            const hasStatus = status === 'removed' && item?._deleted || status === 'edited' && item?._edited || status === 'created' && item?._created;

            console.info({ item, classes, hasStatus });

            if (hasStatus) {
                if (Array.isArray(classes)) {
                    el.classList.add(...classes);
                } else if (typeof classes === 'object') {
                    const evaluated = evaluate(classes);

                    const classesToAdd = Object.entries(evaluated)
                        .filter(([key, value]) => !!value)
                        .map(([key]) => key);

                    const classesToRemove = Object.entries(evaluated)
                        .filter(([key, value]) => !value)
                        .map(([key]) => key);

                    el.classList.add(...classesToAdd);
                    el.classList.remove(...classesToRemove);
                } else {
                    el.classList.add(classes);
                }
            } else {
                if (Array.isArray(classes)) {
                    el.classList.remove(...classes);
                } else if (typeof classes === 'object') {
                    const evaluated = evaluate(classes);

                    const classesToRemove = Object.keys(evaluated);

                    el.classList.remove(...classesToRemove);
                } else {
                    el.classList.remove(classes);
                }
            }
        });
    } else if (status === 'removed' && option !== 'keep') {
        effect(() => {
            const item = getItem();

            if (!item) {
                return;
            }

            if (item._deleted) {
                el.style.display = 'none';
            } else {
                el.style.display = '';
            }
        });
    }
}

function OptimisticListDirective(el, {value, modifiers, expression}, {evaluate, effect}) {
    const getId = () =>
        [
            expression.startsWith('x-optimistic')
                ? null
                : expression,
            el.getAttribute('data-optimistic-id'),
            el.getAttribute('wire:key')
        ]
        .find((id) => id && id !== '');

    const statePath = value ?? 'default';

    Alpine.addScopeToNode(el, {
        $itemSettings: {
            removed: {
                keep: false,
                classes: [],
                attributes: {},
            }
        },

        get $removed() {
            return evaluate(`$optimistic.$removed('${statePath}', '${getId()}')`);
        },

        get $edited() {
            return evaluate(`$optimistic.$edited('${statePath}', '${getId()}')`);
        },

        get $item() {
            return evaluate(`$optimistic.$find('${statePath}', '${getId()}')`);
        },

        /**
         * @param {string} property
         * @param {any} defaultValue
         * @returns {any}
         */
        $optimized(property, defaultValue) {
            return evaluate(`$item?.${property}`) ?? defaultValue;
        },
    });
}

function OptimisticDirective(el, options, Alpine) {
    if (options.value || options.expression === 'x-optimistic') {
        OptimisticListDirective(el, options, Alpine);
    } else {
        OptimisticOptionDirective(el, options, Alpine);
    }
}

export function optimisticAlpinePlugin(Alpine) {
    Alpine.data('optimistic', OptimisticComponent);
    Alpine.directive('optimistic', OptimisticDirective).before('bind');
}
