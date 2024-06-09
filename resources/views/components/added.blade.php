@props([
    'statePath' => 'default',
    'name' => '$item'
])

<div wire:ignore class="flex flex-col gap-2" x-show="$optimistic.{{ $statePath }}_added?.length > 0">
    <template x-for="{{ $name }} in $optimistic.{{ $statePath }}_added">
        {{ $slot }}
    </template>
</div>
