<?php

namespace Capevace\OptimisticUI;

use Attribute;
use Capevace\OptimisticUI\Exceptions\NeedsReflectionForCrud;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Js;
use Livewire\Component;
use ReflectionMethod;

#[Attribute(Attribute::TARGET_METHOD)]
class Optimistic
{
    public string $statePath;
    public string $fn;
    public ?CrudMethod $crud = null;

    public function __construct(
        string|null $statePath = 'default',
        string|Js|null $fn = null,
        public array|null $rules = null,
        string|CrudMethod|null $crud = null,
        public string|null $model = null,
        public string $idAttribute = 'id',
        public ReflectionMethod|null $reflection = null,
        public bool $injectOptimisticId = false,
//        public bool $returnsCreatedId = false,
    )
    {
        if ($fn !== null) {
            $this->fn = (string) $fn;
        }

        if (is_string($crud)) {
            $this->crud = CrudMethod::from($crud);
        } else {
            $this->crud = $crud;
        }

        if ($this->crud !== null) {
            $this->statePath = $statePath ?? str($instance->getMorphClass())
                ->afterLast('\\')
                ->snake()
                ->plural();

            $this->setupCrud(
                is_string($crud)
                    ? CrudMethod::from($crud)
                    : $crud
            );
        } else {
            $this->statePath = $statePath ?? 'default';
        }
    }

    protected function setupCrud(CrudMethod $crud): void
    {
        assert($this->model, "You need to pass the model for the CRUD optimizer to work");
        assert($this->reflection, "You need to pass the function as reflection for the CRUD optimizer to work");

        /** @var Model $instance */
        $instance = new $this->model;

        $this->idAttribute = $instance->getKeyName();

        $arguments = collect($this->reflection->getParameters());

        $indexOfIdParameter = $arguments
            ->search(fn ($argument) => $argument->getName() === $this->idAttribute);

        assert($this->crud === CrudMethod::CREATE || $indexOfIdParameter !== false, "The method {$this->reflection->getName()} must have an argument named {$this->idAttribute}");

        $this->rules = [
            ...$this->rules ?? [],
            ...collect($arguments)
                ->mapWithKeys(fn ($argument) => [
                    $argument->getName() => ['required', match ($argument->getType()->getName()) {
                        'int' => 'integer',
                        'float' => 'numeric',
                        'bool' => 'boolean',
                        default => 'string',
                    }],
                ])
                ->toArray(),
        ];

        if ($this->crud === CrudMethod::CREATE) {
            $this->rules['id'] = ['required', $instance->getKeyType()];
        }

        $data = $arguments
            ->map(fn ($argument) => $argument->getName())
            ->when($this->crud !== CrudMethod::CREATE, fn ($data) => $data
                ->filter(fn (string $argument) => $argument !== $this->idAttribute)
            )
            ->map(fn (string $argument, int $index) => "{$argument}: params[{$index}]")
            ->join(",");

        $this->fn = match ($crud) {
            CrudMethod::CREATE => "create({ {$data} })",
            CrudMethod::UPDATE => "update(params[{$indexOfIdParameter}], { {$data} })",
            CrudMethod::DELETE => "remove(params[{$indexOfIdParameter}])",
        };
    }

    public function validate(array $parameters): bool
    {
        $validator = validator($parameters, $this->rules);

        if ($validator->fails()) {
            dd($validator->errors(), $parameters);
        }

        return true;
    }

    public function call(Component $component, array $parameters)
    {
        $this->validate($parameters);

        $fnParameters = $this->reflection->getParameters();

        // Only pass the parameters that are defined in the function
        $parameters = collect($fnParameters)
            ->mapWithKeys(fn (\ReflectionParameter $parameter) => [$parameter->getName() => $parameters[$parameter->getName()]])
            ->toArray();

        $this->reflection->invokeArgs($component, $parameters);
    }

    public function toConfiguration(): array
    {
        return [
            'name' => $this->reflection->getName(),
            "statePath" => $this->statePath,
            "fn" => $this->fn,
            "rules" => $this->rules,
            "idAttribute" => $this->idAttribute,
            'parameters' => collect($this->reflection->getParameters())
                ->map(fn (\ReflectionParameter $parameter) => $parameter->getName())
                ->toArray(),
            'injectOptimisticId' => $this->injectOptimisticId,
//            'returnsCreatedId' => $this->returnsCreatedId,
        ];
    }
}
