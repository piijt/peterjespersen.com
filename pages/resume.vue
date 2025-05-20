<template>
  <div class="space-y-8">
    <Resume class="pt-4" :length="999" :summary_view="false" />
    <Seperator />
    <Education />
  </div>
</template>
<script lang="ts" setup>
definePageMeta({
  layout: "root",
});
</script>
