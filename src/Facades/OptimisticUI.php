<?php

namespace Capevace\OptimisticUI\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @see \Capevace\OptimisticUI\LivewireOptimisticUI
 */
class OptimisticUI extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return \Capevace\OptimisticUI\LivewireOptimisticUI::class;
    }
}
