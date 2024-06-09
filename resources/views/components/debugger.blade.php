@props(['statePath', 'pretty' => false])

<pre
    {{ $attributes->class('') }}
    x-html="JSON.stringify(optimistic_updates, null, {{ $pretty ? 2 : 'null' }})"
></pre>
