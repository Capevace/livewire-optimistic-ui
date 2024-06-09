@props([
    'xData' => '{}',
    'entangle' => [],
    'optimizers' => null,
])

<?php
$optimizers ??= $this->getOptimisticHandlerConfiguration();

$statePaths = $optimizers
    ->pluck('statePath')
    ->unique()
    ->values()
    ->all();
?>

<div
    {{ $attributes }}
    x-data="optimistic({
          ...({!! $xData !!}),
          optimizers: JSON.parse(atob('{{ base64_encode(json_encode($optimizers)) }}')),
    })"
    @beforeunload.window="
        const updates = Object.values(optimistic_updates)
            .flatMap(([updates]) => Object.values(updates));

        if (updates.length > 0) {
            event.preventDefault();
        }
    "
>
    {{ $slot }}
</div>



@once
@push('scripts')

{!! \Capevace\OptimisticUI\Facades\OptimisticUI::scripts() !!}

@endpush
@endonce
