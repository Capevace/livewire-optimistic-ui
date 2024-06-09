# Livewire Optimistic UI – A utility package for better Optimistic UI support in Laravel Livewire.



https://github.com/Capevace/livewire-optimistic-ui/assets/10093858/b5fd8cea-a9eb-4fc6-88af-b6809376a774




## Installation

You can install the package via composer:

```bash
composer require capevace/livewire-optimistic-ui
```

## Example

```html
# In your Livewire component's .blade.php file
<x-optimistic::injector class="max-w-lg mx-auto mt-10">
  <x-demo.saving-indicator wire:loading.delay />

  <form
    class="w-full flex items-center gap-5 mb-10"
    x-data="{ text: '' }"
    @submit.prevent="
      $optimistic.addTask(text);
      text = '';
    "
  >
    <input
      autofocus
      name="text"
      x-model="text"
      placeholder="Type your task here..."
      class="flex-1 px-5 py-3 border shadow rounded-lg"
    />

    <button class="px-5 py-3 border shadow rounded-lg bg-green-400">Add +</button>
  </form>

  <x-demo.list>
    @foreach($todos as $task)
      <x-demo.task
        wire:key="{{ $task['id'] }}"
        x-optimistic
        x-optimistic.removed.remove
      >
        <x-demo.button @click="$optimistic.deleteTask('{{ $task['id'] }}')"/>

        <form
          x-data="{
            text: $item?.text ?? @js($task['text']),
          }"
          class="flex-1"
        >
          <x-demo.input
            name="text_{{ $task['id'] }}"
            x-model="text"
            x-optimistic.edited.class="italic"

            @input.debounce="$optimistic.editTask('{{ $task['id'] }}', text)"
          />
        </form>

      </x-demo.task>
    @endforeach

    <x-optimistic::added>
      <x-demo.task
        x-bind:data-id="$item.id"
        x-bind:wire:key="$item.id"
        x-optimistic.removed.remove
      >
        <x-demo.button @click="$optimistic.deleteTask($item.id)"/>

        <div class="flex-1">
          <x-demo.input
            x-bind:name="'text_' + $item.id"
            x-bind:value="$item.text"
            class="italic"
          />
        </div>
      </x-demo.task>
    </x-optimistic::added>
  </x-demo.list>
</x-optimistic::injector>
```

```php
use Capevace\OptimisticUI\WithOptimisticUI;
use Capevace\OptimisticUI\Optimistic;

/**
 * @property-read Collection $todos
 */
class OptimisticPage extends Component
{
    use WithOptimisticUI;

    #[Optimistic(crud: 'create', model: Task::class, injectOptimisticId: true)]
    public function addTask(string $id, string $text): void
    {
        if (!uuid_is_valid($id) || Task::find($id)) {
            return;
        }

        $task = new Task([
            'text' => $text,
        ]);

        $task->id = $id;
        $task->save();
    }

    #[Optimistic(crud: 'delete', model: Task::class)]
    public function deleteTask(string $id): void
    {
        Task::find($id)?->delete();
    }

    #[Optimistic(crud: 'update', model: Task::class)]
    public function editTask(string $id, string $text): void
    {
        Task::find($id)?->update([
            'text' => $text,
        ]);
    }

    #[Computed]
    public function todos(): Collection
    {
        return Task::all();
    }

    public function render(): \Illuminate\View\View
    {
        return view("messages", [
            'todos' => $this->todos,
        ]);
    }
}
```

---

## Usage
### Adding optimistic UI to your Livewire component

You need to wrap your UI with the `x-optimistic::injector` component. This component will handle the optimistic UI for you.

```html
<x-optimistic::injector class="max-w-lg mx-auto mt-10">
  <!-- Your UI here -->
</x-optimistic::injector>
```

You can then call your functions optimistically by using the `$optimistic` object.

```html
<form
  @submit.prevent="
    $optimistic.addTask(text);
    text = '';
  "
>
    <input x-model="text" />
</form>

<!-- OR -->

@foreach($todos as $task)
  <form
    x-data="{ text: $item?.text ?? @js($task['text']) }"  
    @submit.prevent="$optimistic.editTask('{{ $task['id'] }}', text)"
  >
    <input x-model="text" />
  </form>
@endforeach
```

### Displaying the added items

You can use the `x-optimistic::added` directive to display items that are added optimistically. The component will loop all added items and makes each available in the `$item` variable.

```html
<x-optimistic::added>
  <x-demo.task
    x-bind:data-id="$item.id"
    x-bind:wire:key="$item.id"
  >
    <div x-text="$item.text"></div>
  </x-demo.task>
</x-optimistic::added>
```

## Optimistic Directives

You can add the `x-optimistic` directive to inject the optimistic state of a given item. The ID will be inferred from the `wire:key` attribute or can be passed with `x-optimistic="<id>"`.

```html
<x-demo.task 
    x-optimistic
    x-optimistic.edited.class="italic"
    x-optimistic.removed.remove
>
  <!-- Your task here -->
</x-demo.task>
```

## Optimistic Functions

To add an optimistic function to your Livewire component, you can use the `#[Optimistic]` attribute.

```php
use Capevace\OptimisticUI\Optimistic;

#[Optimistic(
    fn: "update(params[0], { message: params[1] })"
)] 
public function changeMessage(string $id, string $message): void
{
    Message::find($id)->update([
        'message' => $message,
    ]);
}
```

The Javascript in the `fn` parameter will be executed on the client-side when the function is called. The `params` array contains the parameters passed to the function.

### Locally generated IDs

When creating new items, a new UUID will be generated for the item. This ID identifies the item in transit. If you use this ID to actually create the item, you can support interactions with the items in transit, as they will be queued.

To use this feature, set the `injectOptimisticId` parameter to `true`.

Locally, you'd still be calling `$optimized.addTask(text)`, but the ID will be injected server-side.

```php
#[Optimistic(
    fn: "create({ text: params[0] })"
    injectOptimisticId: true
)]
public function addTask(string $id, string $text): void
{
    if (!uuid_is_valid($id) || Task::find($id)) {
        return;
    }

    $task = new Task([
        'text' => $text,
    ]);

    $task->id = $id;
    $task->save();
}
```

### Ready-made CRUD functions

The most commonly used functions are implemented out of the box using the `crud` parameter.

Setting this to `create`, `update`, or `delete` will look at your PHP function's parameters using reflection and automatically generate the Javascript function for you.

You also need to supply the `model` parameter, which is then used to only allow updates to `fillable` attributes.

```php
#[Optimistic(crud: 'create', model: Task::class)]
public function addTask(string $id, string $text): void
{
    if (!uuid_is_valid($id) || Task::find($id)) {
        return;
    }

    $task = new Task([
        'text' => $text,
    ]);

    $task->id = $id;
    $task->save();
}

#[Optimistic(crud: 'delete', model: Task::class)]
public function deleteTask(string $id): void
{
    Task::find($id)?->delete();
}

#[Optimistic(crud: 'update', model: Task::class)]
public function editTask(string $id, string $text): void
{
    Task::find($id)?->update([
        'text' => $text,
    ]);
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
