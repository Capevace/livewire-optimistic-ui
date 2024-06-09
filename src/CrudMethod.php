<?php

namespace Capevace\OptimisticUI;

enum CrudMethod: string
{
    case CREATE = 'create';

    // Who knows what the future holds? 😏
    // case READ = 'read';

    case UPDATE = 'update';
    case DELETE = 'delete';
}
