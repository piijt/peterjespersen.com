<template>
  {{ route.params.slug }}
</template>
<script lang="ts" setup>
const route = useRoute();

definePageMeta({
  layout: "root",
});
</script>
