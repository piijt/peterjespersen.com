<template>
    <div class="text-white bg-primary p-4 rounded">
        <SocialLinks class="flex space-y-2" />
        <About />
        <Seperator />
    </div>
</template>

<script lang="ts" setup>
    definePageMeta({
        layout: "root",
    })
</script>
<style scoped>
    .content {
        color: white;
        /* display: flex;
        flex-direction: column; */
    }
    .bg-red {
        background-color: red;
    }
</style>