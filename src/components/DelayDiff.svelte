<script lang="ts">
	import { text } from '@sveltejs/kit';
	import { _ } from 'svelte-i18n';

	import { locale, locales } from 'svelte-i18n';
	export let diff: number;

	//Positive diff means late, negative diff means early

	export let show_seconds = false;

	let textclass: string = 'text-[0px]';

	let h: number = 0;
	let m: number = 0;
	let s: number = 0;

	let this_locale: string | null | undefined = null;

	function locale_hour_marking(l: string | null | undefined) {
		if (typeof l == 'string') {
			if (l == 'zh' || l == 'zh-CN') {
				return '小时';
			}
			if (l == 'zh-TW') {
				return '小時';
			}

			if (l.startsWith('ko')) {
				return '시간';
			}

			if (l.startsWith('ja')) {
				return '時間';
			}
		}

		return 'h';
	}

	function locale_min_marking(l: string | null | undefined) {
		if (typeof l == 'string') {
			if (l == 'zh' || l == 'zh-CN') {
				return '分';
			}
			if (l == 'zh-TW') {
				return '分';
			}
			if (l.startsWith('ko')) {
				return '분';
			}

			if (l.startsWith('ja')) {
				return '分';
			}
		}

		if (show_seconds) {
			return 'm';
		}
		return 'min';
	}

	function locale_s_marking(l: string | null | undefined) {
		if (typeof l == 'string') {
			if (l == 'zh' || l == 'zh-CN' || l == "zh_CN") {
				return '秒';
			}
			if (l == 'zh-TW' || l == "zh_TW") {
				return '秒';
			}
			if (l.startsWith('ko')) {
				return '초';
			}

			if (l.startsWith('ja')) {
				return '秒';
			}
		}

		return 's';
	}

	locale.subscribe((x) => (this_locale = x));

	$: if (diff) {
		textclass = 'text-[#58A738] dark:text-[#58A738]';

		if (diff <= -60) {
			textclass = 'text-yellow-600 dark:text-yellow-400 ';
		}

		if (diff <= -300) {
			textclass = 'text-red-600 dark:text-red-400 ';
		}

		if (diff >= 180) {
			textclass = 'text-yellow-600 dark:text-yellow-400 ';
		}

		if (diff >= 300) {
			textclass = 'text-red-700 dark:text-red-400';
		}

		if (diff >= 3600) {
			textclass = 'text-pink-600 dark:text-pink-400'
		}

		let remainder = Math.abs(diff);
		h = Math.floor(remainder / 3600);
		remainder = remainder - h * 3600;
		m = Math.floor(remainder / 60);
		remainder = remainder - m * 60;
		s = remainder;
	}
</script>

<span class={`${ textclass } font-semibold text-[0px]`}>
	<span>
		{#if diff < 0}<span class="text-xs">{$_('early')}</span>
		{/if}{#if diff > 0}<span class="text-xs">{$_('late')}</span>
		{/if}{#if diff == 0}<span class="text-xs font-semibold text-[#58A738]"
				>{$_("ontime")}</span
			>{/if}
		<span class="text-xs">&nbsp;</span>
	</span>

	{#if diff != 0}
		{#if h > 0}
			<span class="text-sm">{h}</span>
			<span class="text-xs">{locale_hour_marking(this_locale)}</span>
		{/if}{#if h > 0 || m > 0 || (!show_seconds && m >= 0 && diff != 0)}
			<span class="text-sm">{!show_seconds && Math.abs(diff) < 60 ? '<1' : m}</span>
			<span class="text-xs">{locale_min_marking(this_locale)}</span>{/if}
		{#if show_seconds}
			{#if Math.abs(diff) > 0}
				<span class="text-sm">{s}</span>
				<span class="text-xs">{locale_s_marking(this_locale)}</span>
			{/if}
		{/if}
	{/if}
</span>
