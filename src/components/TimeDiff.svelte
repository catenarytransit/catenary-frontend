<script lang="ts">
	import { _ } from 'svelte-i18n';

	import { locale, locales } from 'svelte-i18n';
	export let diff: number;
	export let show_brackets: boolean = true;

	let textclass: string = 'slashed-zero tabular-nums';

	let h: number = 0;
	let m: number = 0;
	let s: number = 0;

	setInterval;

	let this_locale: string | null | undefined = null;

	function locale_hour_marking(l: string | null | undefined) {
		if (typeof l == 'string') {
			if (l == 'zh' || l == 'zh-CH') {
				return '小时';
			}
			if (l == 'zh-TW') {
				return '小時';
			}

			if (l.startsWith('ko')) {
				return '시간';
			}
		}

		return 'h';
	}

	function locale_min_marking(l: string | null | undefined) {
		if (typeof l == 'string') {
			if (l == 'zh' || l == 'zh-CH') {
				return '分';
			}
			if (l == 'zh-TW') {
				return '分';
			}
			if (l.startsWith('ko')) {
				return '분';
			}
		}

		return 'm';
	}

	function locale_s_marking(l: string | null | undefined) {
		if (typeof l == 'string') {
			if (l == 'zh' || l == 'zh-CH') {
				return '秒';
			}
			if (l == 'zh-TW') {
				return '秒';
			}
			if (l.startsWith('ko')) {
				return '초';
			}
		}

		return 's';
	}

	locale.subscribe((x) => (this_locale = x));

	$: if (diff) {
		let remainder = Math.abs(diff);
		h = Math.floor(remainder / 3600);
		remainder = remainder - h * 3600;
		m = Math.floor(remainder / 60);
		remainder = remainder - m * 60;
		s = remainder;
	}
</script>

<span class="text-[0px]">
	<span class="text-sm">
		{#if show_brackets}{'['}{/if}{#if diff < 0}-{/if}{#if diff > 0}+{/if}
	</span>

	{#if h > 0}
		<span class="text-sm">{h}</span>
		<span class="text-xs">{locale_hour_marking(this_locale)}</span>
	{/if}
	{#if h > 0 || m > 0}
		<span class="text-sm">{m}</span>
		<span class="text-xs">{locale_min_marking(this_locale)}</span>
	{/if}
	{#if Math.abs(diff) > 0}
		<span class="text-sm">{s.toFixed(0)}</span>
		<span class="text-xs">{locale_s_marking(this_locale)}</span>
	{/if}
	{#if show_brackets}
		<span class="text-sm">{']'}</span>
	{/if}
</span>
