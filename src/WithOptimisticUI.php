<?php

namespace Capevace\OptimisticUI;

use Illuminate\Support\Arr;
use Illuminate\Support\Collection;

trait WithOptimisticUI
{
    public array $id_mapping = [];

    protected ?string $last_optimistic_id = null;

    public function callOptimisticHandler(string $method, string $id, $parameters): void
    {
        $handlers = $this->getOptimisticHandlers();
        /** @var Optimistic|null $handler */
        $handler = $handlers->get($method);


        assert($handler, "No optimistic handler found for method: $method");

        $this->last_optimistic_id = $id;

        // Call $method on $this with $parameters added dynamically (not just in order but rather by mapping the names)
        $handler->call($this, [
            'id' => $id,
            ...$parameters
        ]);

        $this->last_optimistic_id = null;
    }

    public function getOptimisticHandlers(): Collection
    {
        $methods = collect(get_class_methods($this));

        return $methods->mapWithKeys(function (
            string $method
        ) {
            $reflection = new \ReflectionMethod($this, $method);

            $attributes = $reflection->getAttributes(Optimistic::class);

            if (!$reflection->isPublic() || empty($attributes)) {
                return [];
            }

            $arguments = $attributes[0]->getArguments();

            $optimistic = app(Optimistic::class, [
                ...$arguments,
                'reflection' => $reflection
            ]);

            return [
                $method => $optimistic
            ];
        });
    }

    public function getOptimisticHandlerConfiguration(): Collection
    {
        return $this->getOptimisticHandlers()
            ->mapWithKeys(fn (Optimistic $optimistic, string $method) => [
                $method => $optimistic->toConfiguration()
            ]);
    }

    protected function saveIdMapping($createdId)
    {
        if ($this->last_optimistic_id === null) {
            return;
        }

        $this->id_mapping[$this->last_optimistic_id] = $createdId;
    }
}
