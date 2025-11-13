<script lang="ts">
	export let timezone: string;
	export let show_seconds: boolean = false;
	export let time_seconds: number;
</script>

{new Date(time_seconds * 1000).toLocaleTimeString('en-UK', {
	timeZone: timezone,
	hour: '2-digit',
	minute: '2-digit',
	second: show_seconds ? '2-digit' : undefined
})}
