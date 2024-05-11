<script lang="ts">
	import { _ } from 'svelte-i18n';
    
	import { locale, locales } from 'svelte-i18n';
	export let diff: number;

	let textclass: string = '';

	let h: number = 0;
	let m: number = 0;
	let s: number = 0;

    let this_locale: string | null |undefined = null;

    function locale_hour_marking(l: string | null | undefined) {
        if (typeof l == "string") {
            if (l == "zh" || l == "zh-CH") {
                return "小时"
            }
            if (l == "zh-TW") {
                return "小時"
            }

            if (l.startsWith("ko")) {
                return "시간"
            }
        }

        return "h";
    }

    function locale_min_marking(l: string | null | undefined) {
        if (typeof l == "string") {
            if (l == "zh" || l == "zh-CH") {
                return "分"
            }
            if (l == "zh-TW") {
                return "分"
            }
            if (l.startsWith("ko")) {
                return "분"
            }
        }

        return "m";
    }

    function locale_s_marking(l: string | null | undefined) {
        if (typeof l == "string") {
            if (l == "zh" || l == "zh-CH") {
                return "秒"
            }
            if (l == "zh-TW") {
                return "秒"
            }
            if (l.startsWith("ko")) {
                return "초"
            }
        }

        return "s";
    }

    locale.subscribe((x) => this_locale = x);

	$: if (diff) {
		if (diff < 60) {
			textclass = 'text-yellow-600 text-yellow-400';
		}

		if (diff > 60) {
			textclass = 'text-red-700 text-red-400';
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
		{'('}
		{#if diff < 0}
			{$_('early')}
		{/if}

		{#if diff > 0}
			{$_('late')}
		{/if}

		{#if diff == 0}
			{$_('ontime')}
		{/if}
	</span>

	{#if h > 0}
		{h}{locale_hour_marking(this_locale)}
	{/if}
	{#if h > 0 || m > 0}
		{m}
        {locale_min_marking(this_locale)}
	{/if}
	{#if Math.abs(diff) > 0}
		{s}{locale_s_marking(this_locale)}
	{/if}
	{')'}
</span>
