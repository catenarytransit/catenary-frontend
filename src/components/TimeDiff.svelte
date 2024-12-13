<script lang="ts">
	import { _ } from 'svelte-i18n';

	import { locale, locales } from 'svelte-i18n';
	export let diff: number;
	export let show_brackets: boolean = true;

	export let show_seconds: boolean = false;

	export let large: boolean = false;

	let textclass: string = 'slashed-zero tabular-nums';

	let h: number = 0;
	let m: number = 0;
	let s: number = 0;

	setInterval;

	let this_locale: string | null | undefined = null;

	function locale_hour_marking(l: string | null | undefined) {
		if (typeof l == 'string') {
			if (l == 'zh' || l == 'zh-CN' || l == "zh_CN") {
				return '小时';
			}
			if (l == 'zh-TW' || l == "zh_TW") {
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
			if (l == 'zh' || l == 'zh-CN') {
				return '分';
			}
			if (l == 'zh-TW' || l == "zh_TW") {
				return '分';
			}
			if (l.startsWith('ko')) {
				return '분';
			}
		}

		return 'min';
	}

	function locale_s_marking(l: string | null | undefined) {
		if (typeof l == 'string') {
			if (l == 'zh' || l == 'zh-CN') {
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
		let remainder = Math.floor(Math.abs(diff));
		h = Math.floor(remainder / 3600);
		remainder = remainder - h * 3600;
		m = Math.floor(remainder / 60);
		remainder = remainder - m * 60;
		s = remainder;
	}
</script>

<span class={large ? "" : "text-[0px]"}>
	<span class={large ? "text-lg" : "text-sm"}>
		{#if show_brackets}{'['}{/if}
		{#if diff < 0}{"-"}{/if}{#if diff > 0}{""}{/if}
	</span>
	{#if h > 0}
		<span class={large ? "text-sm" : "text-sm"}>{h}</span>
		<span class={large ? "text-sm" : "text-xs"}>{locale_hour_marking(this_locale)}</span>
	{/if}
	{#if h > 0 || (m > 0 || (!show_seconds && m >= 0 && diff != 0))}
		<span class={large ? "text-base" : "text-sm"}>{m}</span>
		<span class={large ? "text-sm" : "text-xs"}>{locale_min_marking(this_locale)}</span>
	{/if}
	{#if show_seconds}
		{#if Math.abs(diff) > 0}
			<span class={large ? "text-base" : "text-sm"}>{s.toFixed(0)}</span>
			<span class={large ? "text-sm" : "text-xs"}>{locale_s_marking(this_locale)}</span>
		{/if}
	{/if}
	
	{#if show_brackets}
		<span class={large ? "text-lg" : "text-sm"}>{']'}</span>
	{/if}
</span>
