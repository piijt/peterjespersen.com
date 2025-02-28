<template>
  <div>
    <Resume class="pt-4" :length="999" :summary_view="false" />
    <Education />
  </div>
</template>
<script lang="ts" setup>
definePageMeta({
  layout: "root",
});
</script>
