# A utility package for better Optimistic UI support in Laravel Livewire.

[![Latest Version on Packagist](https://img.shields.io/packagist/v/capevace/livewire-optimistic-ui.svg?style=flat-square)](https://packagist.org/packages/capevace/livewire-optimistic-ui)
[![GitHub Tests Action Status](https://img.shields.io/github/actions/workflow/status/capevace/livewire-optimistic-ui/run-tests.yml?branch=main&label=tests&style=flat-square)](https://github.com/capevace/livewire-optimistic-ui/actions?query=workflow%3Arun-tests+branch%3Amain)
[![GitHub Code Style Action Status](https://img.shields.io/github/actions/workflow/status/capevace/livewire-optimistic-ui/fix-php-code-style-issues.yml?branch=main&label=code%20style&style=flat-square)](https://github.com/capevace/livewire-optimistic-ui/actions?query=workflow%3A"Fix+PHP+code+style+issues"+branch%3Amain)
[![Total Downloads](https://img.shields.io/packagist/dt/capevace/livewire-optimistic-ui.svg?style=flat-square)](https://packagist.org/packages/capevace/livewire-optimistic-ui)

## Installation

You can install the package via composer:

```bash
composer require capevace/livewire-optimistic-ui
```

You can publish the config file with:

```bash
php artisan vendor:publish --tag="livewire-optimistic-ui-config"
```

Optionally, you can publish the views using

```bash
php artisan vendor:publish --tag="livewire-optimistic-ui-views"
```

## Usage

```php
# In your Livewire component's .blade.php file
<x-optimism>
	@foreach($todos as $todo)
        <div
            wire:key="{{ $todo['id'] }}"
            x-optimism:todos="{{ $todo['id'] }}"
        >
            <span
                x-optimism.text="text"
                @click="optimize('editTodo', '{{ $todo['id'] }}', prompt('Edited text'))"
            >
                {{ $todo['message'] }}
            </span>

            <button @click.prevent="optimize('deleteTodo', '{{ $todo['id'] }}')">
                Delete
            </button>
        </div>
    @endforeach
        

    <x-optimism.added statePath="todos">
        <div style="opacity: 0.5;">
            <button
                x-text="item.message"
                @click="optimize('editMessage', item.id, prompt('Neuer Text'))"
            >
            </button>
            <button type="button" disabled>x</button>
        </div>
    </x-optimism.added>
```

```php
# In your Livewire component's .php file

use Capevace\OptimisticUI\WithOptimisticUI;
use Capevace\OptimisticUI\Optimistic;
use Livewire\Attributes\Computed;

#[OptimisticCrud(Todo::class)]
class Todos extends Component
{
    use WithOptimisticUI;

    #[Computed]
    public function todos()
    {
        return Todo::all();
    }

    #[Optimistic(crud: 'create')]
    public function addTodo(string $text)
    {
        Todo::create(['text' => $text]);
        
        unset($this->todos);
    }

    #[Optimistic(crud: 'update')]
    public function editTodo($id, $text)
    {
        $todo = Todo::findOrFail($id);
        $todo->update(['text' => $text]);
        
        unset($this->todos);
    }

    #[Optimistic(crud: 'delete')]
    public function deleteTodo($id)
    {
        $todo = Todo::findOrFail($id);
        $todo->delete();
        
        unset($this->todos);
    }
    
    /*
     * Completely customizable optimistic data manipulation behavior
     */
    #[Optimistic(
        // The state path to the data you want to optmistically manipulate locally.
        statePath: 'todos',
        
        // Write some JS to modify your state locally to reflect the changes you expect to happen.
        // Use the `create(data: any)`, `update(id: string, data: any)` or `remove(id: string)` functions to update the state.
        // The `params` array contains the arguments passed to your Livewire `setTime` function, in this case the ID of the todo item.
        fn: <<<JS
        update(params[0], { due_at: new Date().setDate(new Date().getDate() + 1) });
        JS
        
        /*
         * Some more options:
         */
        
        // Optionally, for simple CRUD tasks, use the shorthand syntax and to update item data by just mapping function arguments to the statePath.
        // This does the same as the `fn` above, which can now be omitted. It
        update: ['text'],
        // Also works with multiple arguments, and `create` and `remove` functions. 
        update: ['text', 'due_at'],
        create: ['text'],
        remove: true,
        
        
        // Customize the ID attribute of the item to be updated. Defaults to 'id'.
        idAttribute: 'id',
        
        // Pass some validation rules to validate the data before updating the state. Uses the parameter names of the function.
        // NOT ALL VALIDATION RULES ARE SUPPORTED. See valid rules in the documentation below.
        rules: [
            'id' => 'required|uuid',
        ],
        
    )]
    public function setTime($id)
    {
        $todo = Todo::findOrFail($id);
        $todo->update(['due_at' => now()->addDay()]);
        
        unset($this->todos);
    }
}


```

## Testing

```bash
composer test
```

## Changelog

Please see [CHANGELOG](CHANGELOG.md) for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md) for details.

## Security Vulnerabilities

Please review [our security policy](../../security/policy) on how to report security vulnerabilities.

## Credits

- [Lukas Mateffy](https://github.com/Capevace)
- [All Contributors](../../contributors)

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
