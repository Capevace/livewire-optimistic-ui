<?php

namespace Capevace\OptimisticUI;

use Illuminate\Support\Facades\Blade;

class LivewireOptimisticUI
{
    public function scripts(): string
    {
        $path = base_path('livewire-optimistic-ui/resources/js/optimistic.js');
        $contents = file_get_contents($path);

        return <<<HTML
            <script type="module">
                $contents

                window.addEventListener('alpine:init', () => {
                    optimisticAlpinePlugin(window.Alpine);
                });
            </script>
        HTML;
    }
}
