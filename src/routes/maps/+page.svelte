<script context="module">
    export async function load() {
        return {
            status: 301,
            redirect: "/map"
        };
    }

    //redirect to /map
    //this is a hacky way to do it, but it works

    window.location.href = "/map";
</script>