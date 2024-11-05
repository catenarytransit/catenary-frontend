<script lang="ts">
	import { text } from '@sveltejs/kit';
	import { _ } from 'svelte-i18n';

	import { locale, locales } from 'svelte-i18n';
	export let diff: number;

	//Positive diff means late, negative diff means early

	export let simple: boolean = false;

	let textclass: string = 'text-[0px]';

	let h: number = 0;
	let m: number = 0;
	let s: number = 0;

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
		if (diff < 60) {
			textclass = 'text-[0px] text-yellow-600 dark:text-yellow-400 font-semibold';
		}

		if (diff > 60) {
			textclass = 'text-[0px] text-red-700 dark:text-red-400 font-semibold';
		}

		let remainder = Math.abs(diff);
		h = Math.floor(remainder / 3600);
		remainder = remainder - h * 3600;
		m = Math.floor(remainder / 60);
		remainder = remainder - m * 60;
		s = remainder;
	}
</script>

<span class={textclass}>
	<span>
		{#if diff < -20}<span class="text-sm">{$_('early')}</span>
		{/if}{#if diff > 20}<span class="text-sm">{$_('late')}</span>
		{/if}{#if diff >= -20 && diff <= 20}<span class="text-sm font-semibold text-[#58A738]"
				>{$_('ontime')}</span
			>{/if}
		<span class="text-sm"> &nbsp; </span>
	</span>

	{#if diff < -20 || diff > 20}
		{#if h > 0}
			<span class="text-sm">{h}</span>
			<span class="text-xs">{locale_hour_marking(this_locale)}</span>
		{/if}{#if h > 0 || m > 0 || (simple && m >= 0 && diff != 0)}
			<span class="text-sm">{simple && diff < 60 ? '<1' : m}</span>
			<span class="text-xs">{locale_min_marking(this_locale)}</span>{/if}
		{#if !simple}
			{#if Math.abs(diff) > 0}
				<span class="text-sm">{s}</span>
				<span class="text-xs">{locale_s_marking(this_locale)}</span>
			{/if}
		{/if}
	{/if}
</span>
