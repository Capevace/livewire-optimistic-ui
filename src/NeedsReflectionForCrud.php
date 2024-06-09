<?php

namespace Capevace\OptimisticUI\Exceptions;

use Throwable;

class NeedsReflectionForCrud extends \Exception
{
    public function __construct(string $message = "For the CRUD optimizer to work, you need to pass the function as reflection", ?Throwable $previous = null)
    {
        parent::__construct($message, previous: $previous);
    }
}
