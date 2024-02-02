<script lang="ts">
  export let changesetting: () => void;
  export let cssclass: string;
  export let text: string;

  function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Enter' || event.key === ' ') {
          changesetting();
      }
  }
</script>

<div
  role="button"
  tabindex="0"
  on:click={changesetting}
  on:keydown={handleKeydown}
  class={cssclass}
>
  <p class="w-full align-center text-center">{text}</p>
</div>
